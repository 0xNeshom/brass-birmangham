-- Move reusable invitation codes from one league-wide code to per-tournament
-- codes. Existing membership, tournament, match and history rows are preserved.

drop trigger if exists brass_join_league_on_auth_registration on auth.users;
drop function if exists private.join_league_on_auth_registration();
drop function if exists public.lookup_league_invite(text);
drop function if exists public.rotate_league_invite(text, text);
drop function if exists public.league_invite_updated_at();
drop table if exists private.league_invites;

create table private.tournament_invites (
  tournament_id uuid primary key references public.tournaments(id) on delete restrict,
  invite_id uuid not null unique default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  updated_by text not null
);
alter table private.tournament_invites enable row level security;
revoke all on private.tournament_invites from public, anon, authenticated, service_role, supabase_auth_admin;

-- Existing active members create tournaments with a fresh invite in the same
-- transaction. The administrator can bootstrap the first tournament before
-- any member exists, also with its invite created atomically.
create or replace function public.create_league_tournament(p_title text, p_code_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_id uuid; v_title text;
begin
  v_group := private.member_group();
  v_title := private.trim_text(p_title);
  if v_title is null or char_length(v_title) not between 1 and 80 then raise exception 'VALIDATION'; end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'VALIDATION'; end if;
  insert into public.tournaments(group_id,title,last_editor,rules_version)
    values(v_group,v_title,auth.uid(),2) returning id into v_id;
  insert into public.matches(tournament_id,number) select v_id,generate_series(1,10);
  insert into private.tournament_invites(tournament_id,code_hash,updated_by)
    values(v_id,p_code_hash,auth.uid()::text);
  return v_id;
end $$;

create function public.admin_create_league_tournament(p_title text, p_code_hash text, p_actor text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_id uuid; v_title text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_actor is null or char_length(p_actor) not between 3 and 254 then raise exception 'VALIDATION'; end if;
  v_title := private.trim_text(p_title);
  if v_title is null or char_length(v_title) not between 1 and 80 then raise exception 'VALIDATION'; end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'VALIDATION'; end if;
  select id into strict v_group from public.private_groups where singleton;
  insert into public.tournaments(group_id,title,rules_version)
    values(v_group,v_title,2) returning id into v_id;
  insert into public.matches(tournament_id,number) select v_id,generate_series(1,10);
  insert into private.tournament_invites(tournament_id,code_hash,updated_by)
    values(v_id,p_code_hash,p_actor);
  return v_id;
end $$;

create function public.rotate_tournament_invite(p_tournament_id uuid, p_code_hash text, p_actor text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_actor is null or char_length(p_actor) not between 3 and 254 then raise exception 'VALIDATION'; end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then raise exception 'VALIDATION'; end if;
  perform 1 from public.tournaments t where t.id = p_tournament_id and t.rules_version = 2
    and not exists(select 1 from public.matches m where m.tournament_id = t.id and m.played_at is not null)
    for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  insert into private.tournament_invites(tournament_id, code_hash, updated_by)
    values (p_tournament_id, p_code_hash, p_actor)
    on conflict (tournament_id) do update
      set invite_id = gen_random_uuid(), code_hash = excluded.code_hash,
        updated_at = now(), updated_by = excluded.updated_by;
end $$;

create function public.lookup_tournament_invite(p_code_hash text)
returns table(invite_id uuid, tournament_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then return; end if;
  return query select i.invite_id, i.tournament_id from private.tournament_invites i
    join public.tournaments t on t.id = i.tournament_id and t.rules_version = 2
    where i.code_hash = p_code_hash
      and not exists(select 1 from public.matches m where m.tournament_id = t.id and m.played_at is not null);
end $$;

create function private.join_tournament_on_auth_registration() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tournament uuid;
  v_group uuid;
  v_name text;
  v_slot integer;
begin
  if not coalesce(new.raw_app_meta_data ? 'brass_tournament_invite_id', false) then return new; end if;
  if tg_op = 'UPDATE' and old.raw_app_meta_data->>'brass_tournament_invite_id' is not distinct from
    new.raw_app_meta_data->>'brass_tournament_invite_id' then return new; end if;

  select i.tournament_id, t.group_id into v_tournament, v_group
    from private.tournament_invites i
    join public.tournaments t on t.id = i.tournament_id
    where i.invite_id = (new.raw_app_meta_data->>'brass_tournament_invite_id')::uuid
      and t.rules_version = 2;
  if v_tournament is null or nullif(new.email, '') is null then raise exception 'INVALID_TOURNAMENT_INVITE'; end if;

  perform 1 from public.tournaments where id = v_tournament and rules_version = 2 for update;
  if not found then raise exception 'INVALID_TOURNAMENT_INVITE'; end if;
  perform 1 from private.tournament_invites
    where tournament_id = v_tournament
      and invite_id = (new.raw_app_meta_data->>'brass_tournament_invite_id')::uuid
    for share;
  if not found then raise exception 'INVALID_TOURNAMENT_INVITE'; end if;
  if exists(select 1 from public.matches where tournament_id = v_tournament and played_at is not null) then
    raise exception 'ROSTER_LOCKED';
  end if;
  v_name := private.trim_text(new.raw_user_meta_data->>'display_name');
  if v_name is null or char_length(v_name) not between 1 and 40 then raise exception 'INVALID_DISPLAY_NAME'; end if;
  if exists(select 1 from public.players where tournament_id = v_tournament
      and left_at is null and name_key = private.name_key(v_name)) then
    raise exception 'DUPLICATE_DISPLAY_NAME';
  end if;

  insert into public.group_members(group_id, user_id) values (v_group, new.id)
    on conflict (group_id, user_id) do nothing;
  insert into public.member_profiles(user_id, display_name) values (new.id, v_name);
  select coalesce(max(slot), 0) + 1 into v_slot from public.players where tournament_id = v_tournament;
  insert into public.players(tournament_id, slot, name, member_user_id)
    values (v_tournament, v_slot, v_name, new.id);
  update public.tournaments set updated_at = now(), last_editor = new.id where id = v_tournament;
  return new;
end $$;

create trigger brass_join_tournament_on_auth_registration
after insert or update of raw_app_meta_data on auth.users
for each row execute function private.join_tournament_on_auth_registration();

create function public.admin_list_league_tournaments()
returns table(id uuid, title text, created_at timestamptz, code_updated_at timestamptz, can_invite boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  return query select t.id, t.title, t.created_at, i.updated_at,
      not exists(select 1 from public.matches m where m.tournament_id = t.id and m.played_at is not null)
    from public.tournaments t left join private.tournament_invites i on i.tournament_id = t.id
    where t.rules_version = 2 order by t.created_at desc, t.id;
end $$;

create or replace function public.before_user_created(event jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Use the tournament registration form.'
  ));
$$;

revoke all on function private.join_tournament_on_auth_registration()
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on function public.create_league_tournament(text) from public, anon, authenticated;
revoke all on function public.create_league_tournament(text, text),
  public.admin_create_league_tournament(text, text, text) from public, anon, authenticated, supabase_auth_admin;
revoke all on function public.rotate_tournament_invite(uuid, text, text),
  public.lookup_tournament_invite(text), public.admin_list_league_tournaments()
  from public, anon, authenticated, supabase_auth_admin;
grant execute on function public.rotate_tournament_invite(uuid, text, text),
  public.lookup_tournament_invite(text), public.admin_list_league_tournaments() to service_role;
grant execute on function public.create_league_tournament(text, text) to authenticated;
grant execute on function public.admin_create_league_tournament(text, text, text) to service_role;
