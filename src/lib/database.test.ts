// PostgreSQL WASM executes the real migration. Multi-connection locking and
// Supabase Auth/PostgREST/Realtime require the separate local integration script.
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, test } from 'vitest';
import type { Tournament } from '@/domain/tournament';
import { nameKey } from '@/domain/name-key';
import casefold from '@/domain/unicode-casefold.json';
import { validateNames } from '@/domain/tournament';
import { decodeTournament } from './repository';
let db: PGlite;
const member = '00000000-0000-4000-8000-000000000002';
const outsider = '00000000-0000-4000-8000-000000000003';
const member2 = '00000000-0000-4000-8000-000000000004';
const member3 = '00000000-0000-4000-8000-000000000005';
const member4 = '00000000-0000-4000-8000-000000000006';
const member5 = '00000000-0000-4000-8000-000000000007';
const group = '00000000-0000-4000-8000-000000000001';
let legacyTournamentId: string;
async function asUser(id: string, role = 'authenticated') {
  await db.exec(`reset role; set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
}
async function create() {
  await db.exec('reset role');
  await db.exec('begin');
  let id: string;
  try {
    id=(await db.query<{id:string}>("insert into public.tournaments(group_id,title,last_editor,rules_version) values($1,'Legacy ledger fixture',$2,1) returning id",[group,member])).rows[0].id;
    await db.query("insert into public.players(tournament_id,slot,name) values($1,1,'Ada'),($1,2,'Bob'),($1,3,'Cy')",[id]);
    await db.query('insert into public.matches(tournament_id,number) select $1,generate_series(1,10)',[id]);
    await db.exec('commit');
  } catch (error) { await db.exec('rollback'); throw error; }
  await asUser(member);
  return id;
}
async function snapshot(id: string) {
  return (await db.query<{ value: Tournament }>('select public.read_tournament($1) as value', [id])).rows[0].value;
}
async function save(id: string, n: number, version: number, placements = [1,2,3]) {
  return db.query('select public.save_match_result($1,$2,$3,$4)', [id,n,placements,version]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
    grant usage on schema auth to anon,authenticated,service_role,supabase_auth_admin;
    grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role,supabase_auth_admin;
    insert into auth.users values
      ('${member}','member@example.com',now()),('${outsider}','outsider@example.com',now()),
      ('${member2}','member2@example.com',now()),('${member3}','member3@example.com',now()),('${member4}','member4@example.com',now()),('${member5}','member5@example.com',now());`);
  await db.exec(await readFile(new URL('../../supabase/migrations/202611090001_tournament.sql',import.meta.url),'utf8'));
  await db.query('insert into public.group_members values($1,$2,1)',[group,member]);
  legacyTournamentId = (await db.query<{id:string}>("insert into public.tournaments(group_id,title,completed_at) values($1,'Legacy three-player ledger',now()) returning id",[group])).rows[0].id;
  await db.query('insert into public.players(tournament_id,slot,name) values($1,1,$2),($1,2,$3),($1,3,$4)',[legacyTournamentId,'Legacy Ada','Legacy Bea','Legacy Cy']);
  await db.query('insert into public.matches(tournament_id,number,played_at) select $1,n,case when n=1 then now() else null end from generate_series(1,10) n',[legacyTournamentId]);
  await db.query('insert into public.match_results(tournament_id,match_number,player_slot,position) values($1,1,1,1),($1,1,2,2),($1,1,3,3)',[legacyTournamentId]);
  await db.exec(await readFile(new URL('../../supabase/migrations/202611140001_league_v2.sql',import.meta.url),'utf8'));
  await db.query('insert into public.group_members(group_id,user_id) values($1,$2),($1,$3),($1,$4),($1,$5)',[group,member2,member3,member4,member5]);
  await db.exec(await readFile(new URL('../../supabase/migrations/202611140002_auth_access.sql',import.meta.url),'utf8'));
}, 30000);
afterAll(async () => { await db?.close(); });
test('frozen Unicode casefold agrees across SQL, validation, generated keys and snapshot decoding', async () => {
  await db.exec('reset role');
  const characters = [...Object.keys(casefold.mappings), 'ΟΣ', 'ος', 'οσ', 'İ', 'i', 'i̇', 'ß', 'ss', 'é', 'é', '😀'];
  const keys = await db.query<{ value: string; key: string }>('select value, private.name_key(value) as key from unnest($1::text[]) value', [characters]);
  expect(casefold.unicodeVersion).toBe('15.0.0');
  expect(keys.rows.map(row => row.key)).toEqual(characters.map(nameKey));
  for (const names of [['ΟΣ','ος','Cy'], ['ΟΣ','οσ','Cy'], ['İ','i̇','Cy'], ['ß','ss','Cy']]) {
    expect(() => validateNames(names)).toThrow();
    await expect(db.query('select private.checked_names($1::text[])', [names])).rejects.toThrow('VALIDATION');
  }
  const names = ['İ','i','Cy'];
  expect(validateNames(names)).toEqual(names);
  expect((await db.query<{ names: string[] }>('select private.checked_names($1::text[]) as names', [names])).rows[0].names).toEqual(names);
  // Roll back this independent fixture so lifecycle tests keep their own state.
  await db.exec('begin');
  try {
    const id = (await db.query<{ id: string }>("insert into public.tournaments(group_id,title,completed_at) values($1,'Unicode fixture',now()) returning id", [group])).rows[0].id;
    await db.query('insert into public.players(tournament_id,slot,name) select $1, ord::int, name from unnest($2::text[]) with ordinality x(name,ord)', [id,names]);
    await db.query('insert into public.matches(tournament_id,number) select $1,generate_series(1,10)', [id]);
    const generated = await db.query<{ key: string }>('select name_key as key from public.players where tournament_id=$1 order by slot', [id]);
    expect(generated.rows.map(row => row.key)).toEqual(names.map(nameKey));
    await asUser(member);
    const value = await snapshot(id);
    expect(decodeTournament(value).players.map(player => player.name)).toEqual(names);
    await db.exec('reset role');
    await expect(db.query("update public.players set name='i̇' where tournament_id=$1 and slot=2", [id])).rejects.toThrow(/unique_player_names_constraint/);
  } finally {
    await db.exec('rollback; reset role');
  }
});
test('anonymous and outsiders cannot access private data or mutation RPCs', async () => {
  await asUser('', 'anon');
  await expect(db.query("select public.create_tournament('Anonymous',array['A','B','C'])")).rejects.toThrow(/permission denied/);
  await expect(db.query("select public.create_league_tournament('Anonymous')")).rejects.toThrow(/permission denied/);
  await expect(db.query('select * from public.tournaments')).rejects.toThrow(/permission denied/);
  await asUser('');
  await expect(db.query("select public.create_league_tournament('Unauthenticated')")).rejects.toThrow('AUTH_REQUIRED');
  await asUser(outsider);
  expect((await db.query('select * from public.tournaments')).rows).toEqual([]);
  expect((await db.query('select * from public.group_members')).rows).toEqual([]);
  await expect(db.query("select public.create_league_tournament('Outsider')")).rejects.toThrow('FORBIDDEN');
  await expect(db.query('select public.list_tournaments()')).rejects.toThrow('FORBIDDEN');
  await expect(db.query('select public.create_league_tournament($1)',['Outsider'])).rejects.toThrow('FORBIDDEN');
  await expect(db.query('select public.list_league_tournaments()')).rejects.toThrow('FORBIDDEN');
});
test('forward migration preserves completed v1 rows and historical player snapshots', async () => {
  await asUser(member);
  const historical = await snapshot(legacyTournamentId);
  expect(historical.players.map(player=>player.name)).toEqual(['Legacy Ada','Legacy Bea','Legacy Cy']);
  expect(historical.matches[0].placements).toEqual([1,2,3]);
  expect((await db.query<{version:number}>('select rules_version as version from public.tournaments where id=$1',[legacyTournamentId])).rows[0].version).toBe(1);
  expect(decodeTournament(historical).players).toHaveLength(3);
  const versioned = (await db.query<{value: { rulesVersion: number; matches: { participants: number[]; placements: number[] | null }[] } }>('select public.read_league_tournament($1) as value',[legacyTournamentId])).rows[0].value;
  expect(versioned.rulesVersion).toBe(1);
  expect(versioned.matches[0]).toMatchObject({ participants: [1,2,3], placements: [1,2,3] });
  expect(versioned.matches[1]).toMatchObject({ participants: [1,2,3], placements: null });
  expect(decodeTournament(versioned as unknown as Tournament).matches[0].placements).toEqual([1,2,3]);
  await db.exec('reset role');
  expect((await db.query<{status:string}>('select status from public.allowed_emails where auth_user_id=$1',[member])).rows[0].status).toBe('active');
});
test('v2 league RPCs support an unlimited roster, exact four-player results and isolated tournaments', async () => {
  for (const [user, name] of [[member,'Ada Global'],[member2,'Bea Global'],[member3,'Cy Global'],[member4,'Dee Global'],[member5,'Eli Global']] as const) {
    await asUser(user);
    await db.query('select public.set_member_profile($1)',[name]);
  }
  await asUser(member);
  const underfilled = (await db.query<{id:string}>("select public.create_league_tournament('Underfilled roster') as id")).rows[0].id;
  for (const user of [member,member2,member3]) {
    await asUser(user);
    await db.query('select public.join_tournament_roster($1)',[underfilled]);
  }
  await asUser(member);
  await db.query("select public.set_member_profile('Ada Revised')");
  expect((await db.query<{name:string}>('select name from public.players where tournament_id=$1 and member_user_id=$2',[underfilled,member])).rows[0].name).toBe('Ada Revised');
  await db.query("select public.set_member_profile('Ada Global')");
  await asUser(member2);
  await expect(db.query("select public.set_member_profile('Ada Global')")).rejects.toThrow('VALIDATION');
  await db.query("select public.set_member_profile('Bea Global')");
  await asUser(member);
  await expect(db.query('select public.select_match_participants($1,1,array[1,2,3,4])',[underfilled])).rejects.toThrow('ROSTER_REQUIRES_FOUR_MEMBERS');
  const first = (await db.query<{id:string}>("select public.create_league_tournament('Four player campaign') as id")).rows[0].id;
  const slots: number[] = [];
  for (const user of [member,member2,member3,member4,member5]) {
    await asUser(user);
    slots.push((await db.query<{slot:number}>('select public.join_tournament_roster($1) as slot',[first])).rows[0].slot);
  }
  expect(slots).toEqual([1,2,3,4,5]);
  await asUser(member);
  await expect(db.query('select public.select_match_participants($1,1,array[1,2,3])',[first])).rejects.toThrow('VALIDATION');
  await expect(db.query('select public.select_match_participants($1,1,array[1,2,2,4])',[first])).rejects.toThrow('VALIDATION');
  await db.query('select public.select_match_participants($1,1,array[1,2,3,5])',[first]);
  await expect(db.query('select public.save_league_match_result($1,3,array[1,2,3,4],0)',[first])).rejects.toThrow('VALIDATION');
  await db.query('select public.save_league_match_result($1,1,array[1,2,3,5],0)',[first]);
  expect((await db.query<{points:number[]}>('select array_agg(points order by placement) points from public.match_participants where tournament_id=$1 and match_number=1',[first])).rows[0].points).toEqual([10,5,0,0]);
  const saved = (await db.query<{value:{rulesVersion:number;players:unknown[];matches:{participants:number[];placements:number[]}[]}}>('select public.read_league_tournament($1) as value',[first])).rows[0].value;
  expect(saved.rulesVersion).toBe(2); expect(saved.players).toHaveLength(5);
  expect(saved.matches[0].participants).toEqual([1,2,3,5]); expect(saved.matches[0].placements).toEqual([1,2,3,5]);
  await expect(db.query('select public.select_match_participants($1,1,array[1,2,3,5])',[first])).rejects.toThrow('MATCH_PARTICIPANTS_LOCKED');
  await db.query('select public.save_league_match_result($1,1,array[3,5,1,2],1)',[first]);
  expect((await db.query<{value:{matches:{placements:number[]}[]}}>('select public.read_league_tournament($1) as value',[first])).rows[0].value.matches[0].placements).toEqual([3,5,1,2]);
  expect((await db.query<{points:number[]}>('select array_agg(points order by placement) points from public.match_participants where tournament_id=$1 and match_number=1',[first])).rows[0].points).toEqual([10,5,0,0]);
  await expect(db.query('select public.join_tournament_roster($1)',[first])).rejects.toThrow('ROSTER_LOCKED');
  await db.query("select public.set_member_profile('Ada Historical')");
  expect((await db.query<{name:string}>('select name from public.players where tournament_id=$1 and member_user_id=$2',[first,member])).rows[0].name).toBe('Ada Global');
  await db.query("select public.set_member_profile('Ada Global')");
  const second = (await db.query<{id:string}>("select public.create_league_tournament('Independent campaign') as id")).rows[0].id;
  for (const user of [member,member2,member3,member4]) {
    await asUser(user);
    await db.query('select public.join_tournament_roster($1)',[second]);
  }
  await asUser(member);
  await db.query('select public.select_match_participants($1,1,array[1,2,3,4])',[second]);
  await db.query('select public.save_league_match_result($1,1,array[4,3,2,1],0)',[second]);
  expect((await db.query<{n:number}>('select count(*)::int n from public.matches where tournament_id=$1 and played_at is not null',[first])).rows[0].n).toBe(1);
  expect((await db.query<{n:number}>('select count(*)::int n from public.matches where tournament_id=$1 and played_at is not null',[second])).rows[0].n).toBe(1);
  await db.exec('reset role');
  await expect(db.query('delete from public.group_members where user_id=$1',[member2])).rejects.toThrow(/foreign key/);
});
test('database constraints reject tournaments with a match count other than ten', async () => {
  await db.exec('reset role; begin');
  await db.query("insert into public.tournaments(group_id,title,rules_version) values($1,'Invalid match-count fixture',2)",[group]);
  await db.query("insert into public.matches(tournament_id,number) select id,1 from public.tournaments where title='Invalid match-count fixture'");
  await expect(db.exec('commit')).rejects.toThrow('TOURNAMENT_REQUIRES_TEN_MATCHES');
  await db.exec('rollback');
});
test('signup hook blocks unknown emails and membership activates only after verification', async () => {
  await db.exec('reset role');
  await db.query("insert into public.allowed_emails(email_normalized,status,approved_by) values('new.member@example.com','approved','admin@example.com')");
  await db.exec("reset role; set role supabase_auth_admin; select set_config('request.jwt.claim.role','supabase_auth_admin',false)");
  const permitted = (await db.query<{value:unknown}>("select public.before_user_created($1::jsonb) as value", [JSON.stringify({ user: { email: 'New.Member@Example.com' } })])).rows[0].value;
  expect(permitted).toEqual({});
  expect((await db.query<{status:string}>("select status from public.allowed_emails where email_normalized='new.member@example.com'")).rows[0].status).toBe('pending_verification');
  const denied = (await db.query<{value:{error:{http_code:number}}}>("select public.before_user_created($1::jsonb) as value", [JSON.stringify({ user: { email: 'unknown@example.com' } })])).rows[0].value;
  expect(denied.error.http_code).toBe(403);
  await db.exec('reset role');
  await db.query("insert into auth.users values($1,'new.member@example.com',null)", ['00000000-0000-4000-8000-000000000008']);
  await asUser('00000000-0000-4000-8000-000000000008');
  await expect(db.query('select public.activate_verified_membership()')).rejects.toThrow('EMAIL_NOT_VERIFIED');
  await db.exec('reset role');
  await db.query("update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000008'");
  await asUser('00000000-0000-4000-8000-000000000008');
  expect((await db.query<{ group_id: string }>('select public.activate_verified_membership() as group_id')).rows[0].group_id).toBe(group);
  await db.query('select public.activate_verified_membership()');
  expect((await db.query<{ n: number }>("select count(*)::int as n from public.group_members where user_id='00000000-0000-4000-8000-000000000008' and status='active'")).rows[0].n).toBe(1);
});
test('atomic lifecycle, validation, optimistic versions, corrections and coherent history', async () => {
  await asUser(member);
  await expect(db.query("insert into public.tournaments(group_id,title) values($1,'bad')",[group])).rejects.toThrow(/permission denied/);
  await expect(db.query('truncate public.tournaments cascade')).rejects.toThrow(/permission denied/);
  await expect(db.query("select public.create_tournament('X',array['Ada','ada','Cy'])")).rejects.toThrow(/permission denied/);
  expect((await db.query('select * from public.group_members')).rows).toHaveLength(1);
  await expect(db.query("select public.create_tournament('X',array['é','é','Cy'])")).rejects.toThrow(/permission denied/);
  const id = await create();
  const first = await snapshot(id);
  const metadata = (await db.query<{ last_editor: string; updated_at: string }>('select last_editor,updated_at from public.tournaments where id=$1', [id])).rows[0];
  expect(metadata.last_editor).toBe(member);
  expect(metadata.updated_at).toBeTruthy();
  expect((await db.query<{ title: string; created_at: string }>('select title,created_at from public.private_groups')).rows[0].title).toBe('The Birmingham Private League');
  for (const table of ['private_groups','group_members','member_profiles','tournaments','players','matches','match_results','match_participants']) {
    await expect(db.query(`delete from public.${table}`)).rejects.toThrow(/permission denied/);
    await expect(db.query(`truncate public.${table} cascade`)).rejects.toThrow(/permission denied/);
  }
  await expect(db.query('insert into public.member_profiles(user_id,display_name) values($1,$2)',[member,'Direct profile'])).rejects.toThrow(/permission denied/);
  expect(first.players).toHaveLength(3); expect(first.matches).toHaveLength(10); expect(first.version).toBe(0);
  const parallelLedger = await create();
  await expect(save(id,2,0)).rejects.toThrow('VALIDATION');
  await expect(save(id,1,0,[1,1,3])).rejects.toThrow('VALIDATION');
  await expect(save(id,1,0,[1,2,4])).rejects.toThrow('VALIDATION');
  expect((await snapshot(id)).version).toBe(0);
  for(let n=1;n<=10;n++) await save(id,n,n-1);
  const complete = await snapshot(id);
  expect(complete.completedAt).toBeTruthy(); expect(complete.version).toBe(10);
  await expect(save(id,1,9)).rejects.toThrow('VERSION_CONFLICT');
  await expect(db.query('select public.rename_players($1,$2,$3)',[id,['Ada','Bob','Cy'],null])).rejects.toThrow('VERSION_CONFLICT');
  const successor = await create();
  await save(id,1,10,[3,2,1]);
  await db.query('select public.rename_players($1,$2,$3)',[id,['Bob','Ada','Cy'],11]);
  const corrected = await snapshot(id);
  expect(corrected.completedAt).toBe(complete.completedAt);
  expect(corrected.matches[0].placements).toEqual([3,2,1]);
  expect(corrected.players.map(p=>p.name)).toEqual(['Bob','Ada','Cy']);
  const editedMetadata = (await db.query<{ last_editor: string; updated_at: string }>('select last_editor,updated_at from public.tournaments where id=$1', [id])).rows[0];
  expect(editedMetadata.last_editor).toBe(member);
  expect(new Date(editedMetadata.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(metadata.updated_at).getTime());
  const page = (await db.query<{value:{items:Tournament[];nextCursor:string|null}}>('select public.list_tournaments(null,1) as value')).rows[0].value;
  expect(page.items.map(t=>t.id)).toEqual([successor]); expect(page.nextCursor).toBe(successor);
  expect((await db.query<{value:{items:Tournament[];nextCursor:string|null}}>('select public.list_tournaments($1,1) as value',[successor])).rows[0].value.items[0].id).not.toBe(successor);
  await db.exec('reset role');
  expect((await db.query<{n:number}>('select count(*)::int n from public.match_results where tournament_id=$1',[id])).rows[0].n).toBe(30);
  expect((await db.query<{n:number}>('select sum(points)::int n from public.match_results where tournament_id=$1',[id])).rows[0].n).toBe(150);
  // As administrator, bypass RLS to verify structural constraints independently.
  await expect(db.query('insert into public.match_results(tournament_id,match_number,player_slot,position) values($1,1,4,1)',[successor])).rejects.toThrow(/foreign key/);
  expect((await db.query<{n:number}>('select count(*)::int n from public.tournaments where id in ($1,$2)',[parallelLedger,successor])).rows[0].n).toBe(2);
});

test('allowlist administration is restricted, revocation immediately removes access, and admin sessions are revocable', async () => {
  await asUser(member);
  await expect(db.query("insert into public.allowed_emails(email_normalized,status,approved_by) values('x@example.com','approved','x')")).rejects.toThrow(/permission denied/);
  await db.exec('reset role');
  await asUser('', 'service_role');
  expect((await db.query('select user_id from public.group_members')).rows.length).toBeGreaterThan(0);
  expect((await db.query('select display_name from public.member_profiles')).rows.length).toBeGreaterThan(0);
  await db.query("select public.admin_revoke_email('MEMBER2@EXAMPLE.COM','admin@example.com')");
  await expect(db.query("select public.admin_approve_email('bad-email','admin@example.com')")).rejects.toThrow('VALIDATION');
  expect((await db.query<{value:boolean}>('select public.consume_auth_rate_limit($1,2,900) as value', ['a'.repeat(64)])).rows[0].value).toBe(true);
  expect((await db.query<{value:boolean}>('select public.consume_auth_rate_limit($1,2,900) as value', ['a'.repeat(64)])).rows[0].value).toBe(true);
  expect((await db.query<{value:boolean}>('select public.consume_auth_rate_limit($1,2,900) as value', ['a'.repeat(64)])).rows[0].value).toBe(false);
  const session = (await db.query<{id:string}>('select public.create_admin_session(now()+interval \'1 hour\') as id')).rows[0].id;
  expect((await db.query<{valid:boolean}>('select public.validate_admin_session($1) as valid',[session])).rows[0].valid).toBe(true);
  await db.query('select public.revoke_admin_session($1)', [session]);
  expect((await db.query<{valid:boolean}>('select public.validate_admin_session($1) as valid',[session])).rows[0].valid).toBe(false);
  await asUser(member2);
  expect((await db.query('select * from public.tournaments')).rows).toEqual([]);
  await expect(db.query('select public.list_tournaments()')).rejects.toThrow('FORBIDDEN');
  await db.exec('reset role');
  expect((await db.query<{status:string}>('select status from public.group_members where user_id=$1',[member2])).rows[0].status).toBe('revoked');
  expect((await db.query<{action:string}>('select action from public.allowed_email_audit where email_normalized=$1 order by occurred_at desc limit 1',['member2@example.com'])).rows[0].action).toBe('revoked');
});
