-- Invite codes supersede approvals for new registrations. Historical rows stay intact.
create table private.league_invites (
  group_id uuid primary key references public.private_groups(id),
  invite_id uuid not null unique default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  updated_by text not null
);
alter table private.league_invites enable row level security;
revoke all on private.league_invites from public, anon, authenticated, service_role, supabase_auth_admin;

create function public.rotate_league_invite(p_code_hash text, p_actor text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_group uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_actor is null or char_length(p_actor) not between 3 and 254 then raise exception 'VALIDATION'; end if;
  select id into strict v_group from public.private_groups where singleton;
  insert into private.league_invites(group_id, code_hash, updated_by)
    values (v_group, p_code_hash, p_actor)
    on conflict (group_id) do update
      set invite_id = gen_random_uuid(), code_hash = excluded.code_hash,
        updated_at = now(), updated_by = excluded.updated_by;
end $$;

create function public.league_invite_updated_at() returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  return (select i.updated_at from private.league_invites i
    join public.private_groups g on g.id = i.group_id where g.singleton);
end $$;

create function public.lookup_league_invite(p_code_hash text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  return (select invite_id from private.league_invites where code_hash = p_code_hash);
end $$;

-- The Auth admin API may set app_metadata in a separate UPDATE within the
-- account creation transaction. The lock serializes enrollment with rotation.
create function private.join_league_on_auth_registration() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_group uuid;
begin
  if not coalesce(new.raw_app_meta_data ? 'brass_league_invite_id', false) then return new; end if;
  if tg_op = 'UPDATE' then
    if old.raw_app_meta_data->>'brass_league_invite_id' is not distinct from
      new.raw_app_meta_data->>'brass_league_invite_id' then return new; end if;
  end if;
  select group_id into v_group from private.league_invites
    where invite_id = (new.raw_app_meta_data->>'brass_league_invite_id')::uuid for share;
  if v_group is null or nullif(new.email, '') is null then raise exception 'INVALID_LEAGUE_INVITE'; end if;
  insert into public.group_members(group_id, user_id) values (v_group, new.id)
    on conflict (group_id, user_id) do nothing;
  return new;
end $$;

create trigger brass_join_league_on_auth_registration
after insert or update of raw_app_meta_data on auth.users
for each row execute function private.join_league_on_auth_registration();

create function public.admin_revoke_league_member(p_user_id uuid, p_actor text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  if p_actor is null or char_length(p_actor) not between 3 and 254 then raise exception 'VALIDATION'; end if;
  update public.group_members set status = 'revoked', revoked_at = now(), revoked_by = p_actor
    where user_id = p_user_id and status = 'active';
  if not found then return; end if;
  update public.allowed_emails set status = 'revoked', updated_at = now() where auth_user_id = p_user_id;
  select private.name_key(private.trim_text(email)) into v_email from auth.users where id = p_user_id;
  if v_email is not null then
    insert into public.allowed_email_audit(email_normalized, action, actor, auth_user_id)
      values (v_email, 'revoked', p_actor, p_user_id);
  end if;
end $$;

create function public.admin_list_league_members()
returns table(user_id uuid, email text, display_name text, status text, revoked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
  return query
    select m.user_id, u.email::text, p.display_name, m.status, m.revoked_at
    from public.group_members m
    join auth.users u on u.id = m.user_id
    left join public.member_profiles p on p.user_id = m.user_id
    order by u.email, m.user_id;
end $$;

-- Hosted projects may still have this hook configured. Keep it fail-closed for
-- public signup. The privileged Auth createUser endpoint bypasses this hook.
create or replace function public.before_user_created(event jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Use the league registration form.'
  ));
$$;
drop policy auth_hook_read_allowlist on public.allowed_emails;
drop policy auth_hook_mark_pending on public.allowed_emails;
revoke select (email_normalized, status), update (status, updated_at)
  on public.allowed_emails from supabase_auth_admin;
revoke insert, update on public.allowed_emails from service_role;
revoke all on function public.activate_verified_membership(), public.admin_approve_email(text, text),
  public.admin_revoke_email(text, text) from public, anon, authenticated, service_role;
revoke all on function private.join_league_on_auth_registration()
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on function public.rotate_league_invite(text, text), public.league_invite_updated_at(),
  public.lookup_league_invite(text), public.admin_revoke_league_member(uuid, text), public.admin_list_league_members()
  from public, anon, authenticated, supabase_auth_admin;
grant execute on function public.rotate_league_invite(text, text), public.league_invite_updated_at(),
  public.lookup_league_invite(text), public.admin_revoke_league_member(uuid, text), public.admin_list_league_members()
  to service_role;
