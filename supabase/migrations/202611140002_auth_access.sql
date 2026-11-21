-- Registration, membership revocation, and server-only administrator support.
-- The deployed v1 tournament/player/result records are not rewritten.

alter table public.group_members
  add column status text not null default 'active' check (status in ('active','revoked')),
  add column revoked_at timestamptz,
  add column revoked_by text,
  add constraint group_members_revocation_state check (
    (status = 'active' and revoked_at is null) or
    (status = 'revoked' and revoked_at is not null)
  );

create table public.allowed_emails (
  email_normalized text primary key check (char_length(email_normalized) between 3 and 254),
  status text not null check (status in ('approved','pending_verification','active','revoked')),
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  approved_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or auth_user_id is not null)
);
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from public, anon, authenticated;
grant select, insert, update on public.allowed_emails to service_role;
grant select on public.group_members, public.member_profiles to service_role;

create table public.allowed_email_audit (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null,
  action text not null check (action in ('approved','revoked','activated','reapproved')),
  actor text not null,
  auth_user_id uuid,
  occurred_at timestamptz not null default now()
);
alter table public.allowed_email_audit enable row level security;
revoke all on public.allowed_email_audit from public, anon, authenticated;
grant select on public.allowed_email_audit to service_role;
create index allowed_email_audit_email_time on public.allowed_email_audit(email_normalized, occurred_at desc);

-- Carry forward active Auth-backed league members so existing accounts remain
-- eligible and administrable. No historical display name or tournament slot
-- is used to identify an Auth user.
with seeded as (
  insert into public.allowed_emails(email_normalized,status,auth_user_id,approved_by)
  select private.name_key(private.trim_text(u.email)), 'active', m.user_id, 'migration'
  from public.group_members m join auth.users u on u.id=m.user_id
  where m.status='active' and u.email is not null
    and char_length(private.name_key(private.trim_text(u.email))) between 3 and 254
  on conflict(email_normalized) do nothing
  returning email_normalized,auth_user_id
)
insert into public.allowed_email_audit(email_normalized,action,actor,auth_user_id)
select email_normalized,'activated','migration:existing-membership',auth_user_id from seeded;

create table public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
alter table public.admin_sessions enable row level security;
revoke all on public.admin_sessions from public, anon, authenticated;
grant select, insert, update on public.admin_sessions to service_role;

create table public.auth_rate_limits (
  rate_key text primary key check (rate_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts >= 0)
);
create index auth_rate_limits_window on public.auth_rate_limits(window_started_at);
alter table public.auth_rate_limits enable row level security;
revoke all on public.auth_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.auth_rate_limits to service_role;

-- Only Supabase Auth can inspect/change the signup state, and only through the
-- Before User Created hook. This remains an invoker function with narrow grants.
create policy auth_hook_read_allowlist on public.allowed_emails
  for select to supabase_auth_admin using (status in ('approved','pending_verification'));
create policy auth_hook_mark_pending on public.allowed_emails
  for update to supabase_auth_admin
  using (status in ('approved','pending_verification'))
  with check (status = 'pending_verification');
grant usage on schema public to supabase_auth_admin;
grant select (email_normalized,status), update (status,updated_at)
  on public.allowed_emails to supabase_auth_admin;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.name_key(text), private.trim_text(text) to supabase_auth_admin;

create or replace function public.before_user_created(event jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_email text; v_status text;
begin
  if jsonb_typeof(event->'user') <> 'object'
     or nullif(event->'user'->>'email','') is null then
    return jsonb_build_object('error',jsonb_build_object(
      'http_code',400,'message','Registration request is invalid.'
    ));
  end if;
  v_email := private.name_key(private.trim_text(event->'user'->>'email'));
  select status into v_status from public.allowed_emails where email_normalized=v_email for update;
  if not found or v_status not in ('approved','pending_verification') then
    return jsonb_build_object('error',jsonb_build_object(
      'http_code',403,'message','This email address is not approved for registration.'
    ));
  end if;
  update public.allowed_emails set status='pending_verification',updated_at=now()
    where email_normalized=v_email;
  return '{}'::jsonb;
end $$;
revoke all on function public.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;

-- This helper is used by existing v1 and new v2 mutations, so revocation is
-- enforced by every protected RPC that already calls private.member_group().
create or replace function private.member_group() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_group uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select group_id into v_group from public.group_members
    where user_id=auth.uid() and status='active';
  if v_group is null then raise exception 'FORBIDDEN'; end if;
  return v_group;
end $$;

drop policy own_membership on public.group_members;
create policy own_membership on public.group_members for select to authenticated
  using (user_id=(select auth.uid()) and status='active');
drop policy member_group on public.private_groups;
create policy member_group on public.private_groups for select to authenticated
  using (exists(select 1 from public.group_members m where m.group_id=id and m.user_id=(select auth.uid()) and m.status='active'));
drop policy member_tournament on public.tournaments;
create policy member_tournament on public.tournaments for select to authenticated
  using (exists(select 1 from public.group_members m where m.group_id=tournaments.group_id and m.user_id=(select auth.uid()) and m.status='active'));
drop policy league_members_read_profiles on public.member_profiles;
create policy league_members_read_profiles on public.member_profiles for select to authenticated
  using (exists(select 1 from public.group_members m where m.user_id=(select auth.uid()) and m.status='active'));
drop policy league_members_read_match_participants on public.match_participants;
create policy league_members_read_match_participants on public.match_participants for select to authenticated
  using (exists(
    select 1 from public.group_members m join public.tournaments t on t.group_id=m.group_id
    where t.id=match_participants.tournament_id and m.user_id=(select auth.uid()) and m.status='active'
  ));

create or replace function public.read_tournament(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.group_members where user_id=auth.uid() and status='active') then raise exception 'FORBIDDEN'; end if;
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
  if not exists(select 1 from public.group_members where user_id=auth.uid() and status='active') then raise exception 'FORBIDDEN'; end if;
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

create or replace function public.read_league_tournament(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.group_members where user_id=auth.uid() and status='active') then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'id',t.id,'groupId',t.group_id,'title',t.title,'version',t.version,'rulesVersion',t.rules_version,
    'createdAt',t.created_at,'completedAt',t.completed_at,
    'players',(select coalesce(jsonb_agg(jsonb_build_object('slot',p.slot,'name',p.name,'memberId',p.member_user_id,'leftAt',p.left_at) order by p.slot),'[]'::jsonb) from public.players p where p.tournament_id=t.id),
    'matches',(select jsonb_agg(jsonb_build_object('number',m.number,'playedAt',m.played_at,
      'participants',case when t.rules_version=1 then
        (select coalesce(jsonb_agg(p.slot order by p.slot),'[]'::jsonb) from public.players p where p.tournament_id=t.id)
        else (select coalesce(jsonb_agg(mp.player_slot order by coalesce(mp.placement,5),mp.player_slot),'[]'::jsonb) from public.match_participants mp where mp.tournament_id=t.id and mp.match_number=m.number) end,
      'placements',case when t.rules_version=1 then
        (select jsonb_agg(r.player_slot order by r.position) from public.match_results r where r.tournament_id=t.id and r.match_number=m.number)
        else (select case when count(*) filter(where mp.placement is not null)=4 then jsonb_agg(mp.player_slot order by mp.placement) else null end from public.match_participants mp where mp.tournament_id=t.id and mp.match_number=m.number) end
    ) order by m.number) from public.matches m where m.tournament_id=t.id)
  ) into v_result from public.tournaments t where t.id=p_id;
  if v_result is null then raise exception 'NOT_FOUND'; end if;
  return v_result;
end $$;

create or replace function public.list_league_tournaments(p_cursor uuid default null,p_limit integer default 10) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_created timestamptz; v_ids uuid[]; v_items jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.group_members where user_id=auth.uid() and status='active') then raise exception 'FORBIDDEN'; end if;
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

create function public.activate_verified_membership() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_group uuid; v_status text; v_allowed_user uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select email into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if not found or v_email is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  v_email := private.name_key(private.trim_text(v_email));
  select status,auth_user_id into v_status,v_allowed_user from public.allowed_emails
    where email_normalized=v_email for update;
  if not found or v_status not in ('approved','pending_verification','active') then raise exception 'NOT_APPROVED'; end if;
  if v_allowed_user is not null and v_allowed_user<>auth.uid() then raise exception 'NOT_APPROVED'; end if;
  select id into v_group from public.private_groups where singleton=true;
  if v_group is null then raise exception 'LEAGUE_NOT_CONFIGURED'; end if;
  insert into public.group_members(group_id,user_id,member_slot,status,revoked_at,revoked_by)
    values(v_group,auth.uid(),null,'active',null,null)
    on conflict (group_id,user_id) do update set status='active',revoked_at=null,revoked_by=null;
  update public.allowed_emails set status='active',auth_user_id=auth.uid(),updated_at=now()
    where email_normalized=v_email;
  insert into public.allowed_email_audit(email_normalized,action,actor,auth_user_id)
    values(v_email,'activated','verified-registration',auth.uid());
  return v_group;
end $$;

create function public.admin_approve_email(p_email text,p_actor text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_old_status text; v_user uuid; v_status text;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  v_email := private.name_key(private.trim_text(p_email));
  if v_email is null or char_length(v_email) not between 3 and 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_actor is null or char_length(p_actor) not between 3 and 254 then raise exception 'VALIDATION'; end if;
  select status,auth_user_id into v_old_status,v_user from public.allowed_emails where email_normalized=v_email for update;
  if not found then
    insert into public.allowed_emails(email_normalized,status,approved_by) values(v_email,'approved',p_actor);
    v_status := 'approved';
    insert into public.allowed_email_audit(email_normalized,action,actor) values(v_email,'approved',p_actor);
  elsif v_old_status='revoked' and v_user is not null and exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null) then
    update public.group_members set status='active',revoked_at=null,revoked_by=null where user_id=v_user;
    update public.allowed_emails set status='active',approved_by=p_actor,updated_at=now() where email_normalized=v_email;
    v_status := 'active';
    insert into public.allowed_email_audit(email_normalized,action,actor,auth_user_id) values(v_email,'reapproved',p_actor,v_user);
  else
    update public.allowed_emails set status=case when v_old_status in ('pending_verification','revoked') and v_user is null then 'approved' else v_old_status end,
      approved_by=p_actor,updated_at=now() where email_normalized=v_email returning status into v_status;
    insert into public.allowed_email_audit(email_normalized,action,actor,auth_user_id) values(v_email,'approved',p_actor,v_user);
  end if;
  return v_status;
end $$;

create function public.admin_revoke_email(p_email text,p_actor text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_user uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  v_email := private.name_key(private.trim_text(p_email));
  if p_actor is null or char_length(p_actor) not between 3 and 254 then raise exception 'VALIDATION'; end if;
  select auth_user_id into v_user from public.allowed_emails where email_normalized=v_email for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  update public.allowed_emails set status='revoked',approved_by=p_actor,updated_at=now() where email_normalized=v_email;
  update public.group_members set status='revoked',revoked_at=now(),revoked_by=p_actor where user_id=v_user and status='active';
  insert into public.allowed_email_audit(email_normalized,action,actor,auth_user_id)
    values(v_email,'revoked',p_actor,v_user);
end $$;

create function public.consume_auth_rate_limit(p_rate_key text,p_max_attempts integer,p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_attempts integer; v_start timestamptz;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_rate_key is null or p_rate_key !~ '^[0-9a-f]{64}$' or p_max_attempts not between 1 and 100
     or p_window_seconds not between 60 and 86400 then raise exception 'VALIDATION'; end if;
  delete from public.auth_rate_limits where window_started_at < now()-interval '1 day';
  insert into public.auth_rate_limits(rate_key,window_started_at,attempts) values(p_rate_key,now(),1)
  on conflict(rate_key) do update set
    attempts=case when public.auth_rate_limits.window_started_at <= now()-(p_window_seconds*interval '1 second') then 1 else public.auth_rate_limits.attempts+1 end,
    window_started_at=case when public.auth_rate_limits.window_started_at <= now()-(p_window_seconds*interval '1 second') then now() else public.auth_rate_limits.window_started_at end
  returning attempts,window_started_at into v_attempts,v_start;
  return v_attempts <= p_max_attempts;
end $$;

create function public.create_admin_session(p_expires_at timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_expires_at <= now() or p_expires_at > now()+interval '12 hours' then raise exception 'VALIDATION'; end if;
  insert into public.admin_sessions(expires_at) values(p_expires_at) returning id into v_id;
  return v_id;
end $$;
create function public.validate_admin_session(p_session_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  return exists(select 1 from public.admin_sessions where id=p_session_id and revoked_at is null and expires_at>now());
end $$;
create function public.revoke_admin_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  update public.admin_sessions set revoked_at=now() where id=p_session_id and revoked_at is null;
end $$;

revoke all on function public.activate_verified_membership(),public.admin_approve_email(text,text),public.admin_revoke_email(text,text),
  public.consume_auth_rate_limit(text,integer,integer),public.create_admin_session(timestamptz),
  public.validate_admin_session(uuid),public.revoke_admin_session(uuid) from public,anon,authenticated;
grant execute on function public.activate_verified_membership() to authenticated;
grant execute on function public.admin_approve_email(text,text),public.admin_revoke_email(text,text),
  public.consume_auth_rate_limit(text,integer,integer),public.create_admin_session(timestamptz),
  public.validate_admin_session(uuid),public.revoke_admin_session(uuid) to service_role;

revoke all on all functions in schema private from public,anon,authenticated;
