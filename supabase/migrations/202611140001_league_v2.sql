-- Expand the league model without rewriting the deployed v1 ledger.
-- Existing tournament/player/result rows remain v1 snapshots and are not remapped.

create table public.member_profiles (
  user_id uuid primary key references public.group_members(user_id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_profiles enable row level security;
create policy league_members_read_profiles on public.member_profiles
  for select to authenticated
  using (exists (select 1 from public.group_members m where m.user_id = (select auth.uid())));
revoke all on public.member_profiles from public, anon, authenticated;
grant select on public.member_profiles to authenticated;

alter table public.group_members alter column member_slot drop not null;
alter table public.group_members drop constraint group_members_member_slot_check;
alter table public.group_members drop constraint group_members_group_id_member_slot_key;

alter table public.players drop constraint players_slot_check;
alter table public.players add constraint players_slot_positive check (slot > 0);
alter table public.players add column member_user_id uuid references public.group_members(user_id) on delete restrict;
alter table public.players add column joined_at timestamptz not null default now();
alter table public.players add column left_at timestamptz;
create unique index players_one_roster_entry_per_member
  on public.players(tournament_id, member_user_id) where member_user_id is not null;
create index players_active_tournament_roster
  on public.players(tournament_id, slot) where left_at is null;

alter table public.tournaments add column rules_version smallint not null default 1
  check (rules_version in (1, 2));
drop index public.one_unfinished_tournament;

create table public.match_participants (
  tournament_id uuid not null,
  match_number integer not null,
  player_slot integer not null,
  placement integer check (placement between 1 and 4),
  points integer generated always as (
    case placement when 1 then 10 when 2 then 5 else 0 end
  ) stored,
  primary key (tournament_id, match_number, player_slot),
  constraint match_participants_unique_placement unique (tournament_id, match_number, placement)
    deferrable initially deferred,
  foreign key (tournament_id, match_number) references public.matches(tournament_id, number),
  foreign key (tournament_id, player_slot) references public.players(tournament_id, slot)
);

alter table public.match_participants enable row level security;
create policy league_members_read_match_participants on public.match_participants
  for select to authenticated
  using (exists (
    select 1 from public.group_members m
    join public.tournaments t on t.group_id = m.group_id
    where t.id = match_participants.tournament_id and m.user_id = (select auth.uid())
  ));
revoke all on public.match_participants from public, anon, authenticated;
grant select on public.match_participants to authenticated;

-- Matches are created in the same RPC transaction as their tournament. Deferred
-- checks allow that transaction to insert all ten rows before commit.
create function private.assert_ten_tournament_matches() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_tournament uuid;
begin
  if tg_table_name = 'tournaments' then
    v_tournament := new.id;
  elsif tg_op = 'DELETE' then
    v_tournament := old.tournament_id;
  else
    v_tournament := new.tournament_id;
  end if;
  if exists (select 1 from public.tournaments where id = v_tournament)
     and (select count(*) from public.matches where tournament_id = v_tournament) <> 10 then
    raise exception 'TOURNAMENT_REQUIRES_TEN_MATCHES';
  end if;
  return null;
end $$;
create constraint trigger tournament_has_ten_matches
  after insert on public.tournaments deferrable initially deferred
  for each row execute function private.assert_ten_tournament_matches();
create constraint trigger match_count_stays_ten
  after insert or update or delete on public.matches deferrable initially deferred
  for each row execute function private.assert_ten_tournament_matches();

create function private.guard_v2_participant_rows() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_tournament uuid; v_match integer; v_played timestamptz; v_rules smallint; v_count integer; v_ranked integer;
begin
  if tg_table_name = 'matches' then
    if tg_op = 'DELETE' then v_tournament := old.tournament_id; v_match := old.number;
    else v_tournament := new.tournament_id; v_match := new.number; end if;
  elsif tg_op = 'DELETE' then v_tournament := old.tournament_id; v_match := old.match_number;
  else v_tournament := new.tournament_id; v_match := new.match_number; end if;
  select t.rules_version, m.played_at into v_rules, v_played
    from public.tournaments t join public.matches m on m.tournament_id=t.id
    where t.id=v_tournament and m.number=v_match;
  if v_rules = 2 and v_played is not null then
    if tg_table_name = 'match_participants' then
      if tg_op = 'INSERT' or tg_op = 'DELETE' then raise exception 'MATCH_PARTICIPANTS_LOCKED'; end if;
      if new.player_slot is distinct from old.player_slot then raise exception 'MATCH_PARTICIPANTS_LOCKED'; end if;
    end if;
  end if;
  select count(*), count(placement) into v_count, v_ranked
    from public.match_participants where tournament_id=v_tournament and match_number=v_match;
  if v_rules = 2 and v_played is not null and (v_count <> 4 or v_ranked <> 4) then
    raise exception 'MATCH_REQUIRES_FOUR_RANKED_PARTICIPANTS';
  end if;
  return null;
end $$;
create constraint trigger v2_match_participants_complete
  after insert or update or delete on public.match_participants deferrable initially deferred
  for each row execute function private.guard_v2_participant_rows();
create constraint trigger v2_match_result_complete
  after insert or update on public.matches deferrable initially deferred
  for each row execute function private.guard_v2_participant_rows();

create function private.guard_format_specific_writes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_tournament uuid; v_rules smallint;
begin
  if tg_table_name = 'match_results' then
    if tg_op = 'DELETE' then v_tournament := old.tournament_id; else v_tournament := new.tournament_id; end if;
    select rules_version into v_rules from public.tournaments where id=v_tournament;
    if v_rules <> 1 then raise exception 'LEGACY_RESULT_API_REQUIRES_V1'; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger legacy_result_format_guard before insert or update or delete on public.match_results
  for each row execute function private.guard_format_specific_writes();
create trigger legacy_player_name_format_guard before update of name on public.players
  for each row execute function private.guard_format_specific_writes();

-- Old app instances continue to see and correct v1 records while the v2 UI is
-- rolled out; the dedicated v2 readers below expose both versions.
create or replace function public.read_tournament(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.group_members where user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object('id',t.id,'groupId',t.group_id,'title',t.title,'version',t.version,'createdAt',t.created_at,'completedAt',t.completed_at,
    'players',(select jsonb_agg(jsonb_build_object('slot',p.slot,'name',p.name) order by p.slot) from public.players p where p.tournament_id=t.id),
    'matches',(select jsonb_agg(jsonb_build_object('number',m.number,'playedAt',m.played_at,'placements',(select jsonb_agg(r.player_slot order by r.position) from public.match_results r where r.tournament_id=t.id and r.match_number=m.number)) order by m.number) from public.matches m where m.tournament_id=t.id))
  into v_result from public.tournaments t where t.id=p_id and t.rules_version=1;
  if v_result is null then raise exception 'NOT_FOUND'; end if;
  return v_result;
end $$;

create or replace function public.list_tournaments(p_cursor uuid default null,p_limit integer default 10) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_created timestamptz; v_ids uuid[]; v_items jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.group_members where user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'VALIDATION'; end if;
  if p_cursor is not null then
    select created_at into v_created from public.tournaments where id=p_cursor and rules_version=1;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  select array_agg(id order by created_at desc,id desc) into v_ids from (
    select id,created_at from public.tournaments where rules_version=1
      and (p_cursor is null or (created_at,id)<(v_created,p_cursor))
    order by created_at desc,id desc limit p_limit+1
  ) q;
  select coalesce(jsonb_agg(public.read_tournament(id) order by ord),'[]'::jsonb) into v_items
    from unnest(v_ids) with ordinality x(id,ord) where ord<=p_limit;
  return jsonb_build_object('items',v_items,'nextCursor',case when cardinality(v_ids)>p_limit then v_ids[p_limit] else null end);
end $$;

revoke all on all functions in schema private from public,anon,authenticated;

-- The legacy API remains for existing v1 history and correction behavior.
-- The old creation RPC is defined for compatibility but revoked below so new
-- campaigns use the v2 rules.
create or replace function public.create_tournament(p_title text, p_names text[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_id uuid; v_names text[]; v_title text;
begin
  v_group := private.member_group();
  v_names := private.checked_names(p_names);
  v_title := private.trim_text(p_title);
  if v_title is null or char_length(v_title) not between 1 and 80 then raise exception 'VALIDATION'; end if;
  insert into public.tournaments(group_id,title,last_editor,rules_version)
    values(v_group,v_title,auth.uid(),1) returning id into v_id;
  insert into public.players(tournament_id,slot,name)
    select v_id,ord::integer,n from unnest(v_names) with ordinality x(n,ord);
  insert into public.matches(tournament_id,number)
    select v_id,generate_series(1,10);
  return v_id;
end $$;

create function public.set_member_profile(p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_name text;
begin
  v_group := private.member_group();
  -- Serialize profile changes with roster joins so every pre-start snapshot gets
  -- the same global display name even when the RPCs race.
  perform 1 from public.group_members where user_id=auth.uid() and group_id=v_group and status='active' for update;
  v_name := private.trim_text(p_display_name);
  if v_name is null or char_length(v_name) not between 1 and 40 then raise exception 'VALIDATION'; end if;
  perform 1 from public.tournaments t join public.players p on p.tournament_id=t.id
    where t.rules_version=2 and p.member_user_id=auth.uid() and p.left_at is null
    order by t.id for update of t;
  if exists(
    select 1 from public.players p join public.tournaments t on t.id=p.tournament_id
    where p.member_user_id=auth.uid() and p.left_at is null and t.rules_version=2
      and not exists(select 1 from public.matches m where m.tournament_id=t.id and m.played_at is not null)
      and exists(select 1 from public.players other where other.tournament_id=p.tournament_id
        and other.slot<>p.slot and other.name_key=private.name_key(v_name))
  ) then raise exception 'VALIDATION'; end if;
  insert into public.member_profiles(user_id,display_name) values(auth.uid(),v_name)
  on conflict (user_id) do update set display_name=excluded.display_name, updated_at=now();
  update public.players p set name=v_name
    from public.tournaments t
    where t.id=p.tournament_id and t.rules_version=2 and p.member_user_id=auth.uid()
      and p.left_at is null
      and not exists(select 1 from public.matches m where m.tournament_id=t.id and m.played_at is not null);
  update public.tournaments t set updated_at=now(),last_editor=auth.uid()
    where t.rules_version=2
      and exists(select 1 from public.players p where p.tournament_id=t.id and p.member_user_id=auth.uid() and p.left_at is null)
      and not exists(select 1 from public.matches m where m.tournament_id=t.id and m.played_at is not null);
end $$;

create or replace function public.rename_players(p_tournament_id uuid,p_names text[],p_expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_t public.tournaments%rowtype; v_names text[];
begin
  v_group := private.member_group();
  perform 1 from public.private_groups where id=v_group for update;
  select * into v_t from public.tournaments where id=p_tournament_id and group_id=v_group for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_t.rules_version <> 1 then raise exception 'LEGACY_RENAME_API_REQUIRES_V1'; end if;
  if p_expected_version is null or p_expected_version<>v_t.version then raise exception 'VERSION_CONFLICT'; end if;
  v_names := private.checked_names(p_names);
  set constraints public.unique_player_names_constraint deferred;
  update public.players p set name=x.n from unnest(v_names) with ordinality x(n,ord)
    where p.tournament_id=p_tournament_id and p.slot=x.ord;
  set constraints public.unique_player_names_constraint immediate;
  update public.tournaments set version=version+1,updated_at=now(),last_editor=auth.uid() where id=p_tournament_id;
end $$;

create function public.create_league_tournament(p_title text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_id uuid; v_title text;
begin
  v_group := private.member_group();
  v_title := private.trim_text(p_title);
  if v_title is null or char_length(v_title) not between 1 and 80 then raise exception 'VALIDATION'; end if;
  insert into public.tournaments(group_id,title,last_editor,rules_version)
    values(v_group,v_title,auth.uid(),2) returning id into v_id;
  insert into public.matches(tournament_id,number) select v_id,generate_series(1,10);
  return v_id;
end $$;

create function public.join_tournament_roster(p_tournament_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_t public.tournaments%rowtype; v_name text; v_slot integer;
begin
  v_group := private.member_group();
  perform 1 from public.group_members where user_id=auth.uid() and group_id=v_group and status='active' for update;
  select * into v_t from public.tournaments where id=p_tournament_id and group_id=v_group for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_t.rules_version <> 2 then raise exception 'LEGACY_TOURNAMENT_READ_ONLY'; end if;
  if exists(select 1 from public.matches where tournament_id=p_tournament_id and played_at is not null) then raise exception 'ROSTER_LOCKED'; end if;
  select display_name into v_name from public.member_profiles where user_id=auth.uid();
  if v_name is null then raise exception 'PROFILE_REQUIRED'; end if;
  if exists(select 1 from public.players where tournament_id=p_tournament_id
      and member_user_id is distinct from auth.uid() and name_key=private.name_key(v_name)) then
    raise exception 'VALIDATION';
  end if;
  select slot into v_slot from public.players where tournament_id=p_tournament_id and member_user_id=auth.uid();
  if found then
    update public.players set name=v_name,left_at=null where tournament_id=p_tournament_id and slot=v_slot;
    update public.tournaments set updated_at=now(),last_editor=auth.uid() where id=p_tournament_id;
    return v_slot;
  end if;
  select coalesce(max(slot),0)+1 into v_slot from public.players where tournament_id=p_tournament_id;
  insert into public.players(tournament_id,slot,name,member_user_id) values(p_tournament_id,v_slot,v_name,auth.uid());
  update public.tournaments set updated_at=now(),last_editor=auth.uid() where id=p_tournament_id;
  return v_slot;
end $$;

create function public.leave_tournament_roster(p_tournament_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group uuid;
begin
  v_group := private.member_group();
  perform 1 from public.tournaments where id=p_tournament_id and group_id=v_group and rules_version=2 for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if exists(select 1 from public.matches where tournament_id=p_tournament_id and played_at is not null) then raise exception 'ROSTER_LOCKED'; end if;
  update public.players set left_at=now() where tournament_id=p_tournament_id and member_user_id=auth.uid() and left_at is null;
  if not found then raise exception 'NOT_ON_ROSTER'; end if;
  update public.tournaments set updated_at=now(),last_editor=auth.uid() where id=p_tournament_id;
end $$;

create function public.select_match_participants(p_tournament_id uuid,p_match_number integer,p_player_slots integer[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_t public.tournaments%rowtype; v_played timestamptz;
begin
  v_group := private.member_group();
  select * into v_t from public.tournaments where id=p_tournament_id and group_id=v_group for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_t.rules_version <> 2 then raise exception 'LEGACY_TOURNAMENT_READ_ONLY'; end if;
  if p_match_number is null or p_match_number not between 1 and 10 or p_player_slots is null
     or array_ndims(p_player_slots) <> 1 or cardinality(p_player_slots) <> 4
     or (select count(distinct s) from unnest(p_player_slots) s) <> 4 then raise exception 'VALIDATION'; end if;
  select played_at into v_played from public.matches where tournament_id=p_tournament_id and number=p_match_number for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_played is not null then raise exception 'MATCH_PARTICIPANTS_LOCKED'; end if;
  if (select count(*) from public.players where tournament_id=p_tournament_id and left_at is null) < 4 then raise exception 'ROSTER_REQUIRES_FOUR_MEMBERS'; end if;
  if (select count(*) from public.players where tournament_id=p_tournament_id and left_at is null and slot=any(p_player_slots)) <> 4 then raise exception 'INVALID_ROSTER_MEMBER'; end if;
  delete from public.match_participants where tournament_id=p_tournament_id and match_number=p_match_number;
  insert into public.match_participants(tournament_id,match_number,player_slot)
    select p_tournament_id,p_match_number,s from unnest(p_player_slots) s;
  update public.tournaments set updated_at=now(),last_editor=auth.uid() where id=p_tournament_id;
end $$;

create function public.save_league_match_result(p_tournament_id uuid,p_match_number integer,p_placements integer[],p_expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_t public.tournaments%rowtype; v_played timestamptz; v_played_count integer; v_participant_count integer;
begin
  v_group := private.member_group();
  select * into v_t from public.tournaments where id=p_tournament_id and group_id=v_group for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_t.rules_version <> 2 then raise exception 'LEGACY_TOURNAMENT_READ_ONLY'; end if;
  if p_expected_version is null or p_expected_version <> v_t.version then raise exception 'VERSION_CONFLICT'; end if;
  if p_match_number is null or p_match_number not between 1 and 10 or p_placements is null
     or array_ndims(p_placements) <> 1 or cardinality(p_placements) <> 4
     or (select count(distinct s) from unnest(p_placements) s) <> 4 then raise exception 'VALIDATION'; end if;
  select played_at into v_played from public.matches where tournament_id=p_tournament_id and number=p_match_number for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select count(*) into v_participant_count from public.match_participants where tournament_id=p_tournament_id and match_number=p_match_number;
  if v_participant_count <> 4 or (select count(*) from unnest(p_placements) s where not exists(select 1 from public.match_participants p where p.tournament_id=p_tournament_id and p.match_number=p_match_number and p.player_slot=s)) <> 0 then raise exception 'VALIDATION'; end if;
  if (select count(*) from public.match_participants mp join public.players p on p.tournament_id=mp.tournament_id and p.slot=mp.player_slot where mp.tournament_id=p_tournament_id and mp.match_number=p_match_number and p.left_at is null) <> 4 then raise exception 'INVALID_ROSTER_MEMBER'; end if;
  select count(*) into v_played_count from public.matches where tournament_id=p_tournament_id and played_at is not null;
  if v_played is null and p_match_number <> v_played_count+1 then raise exception 'VALIDATION'; end if;
  set constraints public.match_participants_unique_placement deferred;
  update public.match_participants p set placement=x.ord::integer
    from unnest(p_placements) with ordinality x(slot,ord)
    where p.tournament_id=p_tournament_id and p.match_number=p_match_number and p.player_slot=x.slot;
  update public.matches set played_at=coalesce(played_at,now()) where tournament_id=p_tournament_id and number=p_match_number;
  update public.tournaments set version=version+1,updated_at=now(),last_editor=auth.uid(),
    completed_at=case when v_played_count + case when v_played is null then 1 else 0 end = 10 then coalesce(completed_at,now()) else completed_at end
    where id=p_tournament_id;
end $$;

create function public.read_league_tournament(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.group_members where user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'id',t.id,'groupId',t.group_id,'title',t.title,'version',t.version,'rulesVersion',t.rules_version,
    'createdAt',t.created_at,'completedAt',t.completed_at,
    'players',(select coalesce(jsonb_agg(jsonb_build_object('slot',p.slot,'name',p.name,'memberId',p.member_user_id,'leftAt',p.left_at) order by p.slot),'[]'::jsonb) from public.players p where p.tournament_id=t.id),
    'matches',(select jsonb_agg(jsonb_build_object('number',m.number,'playedAt',m.played_at,
      'participants',(select coalesce(jsonb_agg(mp.player_slot order by coalesce(mp.placement,5),mp.player_slot),'[]'::jsonb) from public.match_participants mp where mp.tournament_id=t.id and mp.match_number=m.number),
      'placements',(select case when count(*) filter(where mp.placement is not null)=4 then jsonb_agg(mp.player_slot order by mp.placement) else null end from public.match_participants mp where mp.tournament_id=t.id and mp.match_number=m.number)
    ) order by m.number) from public.matches m where m.tournament_id=t.id)
  ) into v_result from public.tournaments t where t.id=p_id;
  if v_result is null then raise exception 'NOT_FOUND'; end if;
  return v_result;
end $$;

create function public.list_league_tournaments(p_cursor uuid default null,p_limit integer default 10) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_created timestamptz; v_ids uuid[]; v_items jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.group_members where user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'VALIDATION'; end if;
  if p_cursor is not null then select created_at into v_created from public.tournaments where id=p_cursor; if not found then raise exception 'NOT_FOUND'; end if; end if;
  select array_agg(id order by created_at desc,id desc) into v_ids from (
    select id,created_at from public.tournaments where p_cursor is null or (created_at,id)<(v_created,p_cursor)
    order by created_at desc,id desc limit p_limit+1
  ) q;
  select coalesce(jsonb_agg(public.read_league_tournament(id) order by ord),'[]'::jsonb) into v_items
    from unnest(v_ids) with ordinality x(id,ord) where ord<=p_limit;
  return jsonb_build_object('items',v_items,'nextCursor',case when cardinality(v_ids)>p_limit then v_ids[p_limit] else null end);
end $$;

revoke all on function public.create_tournament(text,text[]),public.set_member_profile(text),public.create_league_tournament(text),
  public.join_tournament_roster(uuid),public.leave_tournament_roster(uuid),public.select_match_participants(uuid,integer,integer[]),
  public.save_league_match_result(uuid,integer,integer[],integer),public.read_league_tournament(uuid),public.list_league_tournaments(uuid,integer)
  from public,anon;
grant execute on function public.set_member_profile(text),public.create_league_tournament(text),
  public.join_tournament_roster(uuid),public.leave_tournament_roster(uuid),public.select_match_participants(uuid,integer,integer[]),
  public.save_league_match_result(uuid,integer,integer[],integer),public.read_league_tournament(uuid),public.list_league_tournaments(uuid,integer)
  to authenticated;
revoke execute on function public.create_tournament(text,text[]) from authenticated;

revoke all on all functions in schema private from public,anon,authenticated;
