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
const group = '00000000-0000-4000-8000-000000000001';
async function asUser(id: string, role = 'authenticated') {
  await db.exec(`reset role; set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function create() {
  return (await db.query<{ id: string }>("select public.create_tournament('Ledger',array['Ada','Bob','Cy']) as id")).rows[0].id;
}
async function snapshot(id: string) {
  return (await db.query<{ value: Tournament }>('select public.read_tournament($1) as value', [id])).rows[0].value;
}
async function save(id: string, n: number, version: number, placements = [1,2,3]) {
  return db.query('select public.save_match_result($1,$2,$3,$4)', [id,n,placements,version]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values ('${member}'),('${outsider}');`);
  await db.exec(await readFile(new URL('../../supabase/migrations/202611090001_tournament.sql',import.meta.url),'utf8'));
  await db.query('insert into public.group_members values($1,$2,1)',[group,member]);
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
  await expect(create()).rejects.toThrow(/permission denied/);
  await expect(db.query('select * from public.tournaments')).rejects.toThrow(/permission denied/);
  await asUser('');
  await expect(create()).rejects.toThrow('AUTH_REQUIRED');
  await asUser(outsider);
  expect((await db.query('select * from public.tournaments')).rows).toEqual([]);
  expect((await db.query('select * from public.group_members')).rows).toEqual([]);
  await expect(create()).rejects.toThrow('FORBIDDEN');
  await expect(db.query('select public.list_tournaments()')).rejects.toThrow('FORBIDDEN');
});
test('atomic lifecycle, validation, optimistic versions, corrections and coherent history', async () => {
  await asUser(member);
  await expect(db.query("insert into public.tournaments(group_id,title) values($1,'bad')",[group])).rejects.toThrow(/permission denied/);
  await expect(db.query('truncate public.tournaments cascade')).rejects.toThrow(/permission denied/);
  await expect(db.query("select public.create_tournament('X',array['Ada','ada','Cy'])")).rejects.toThrow('VALIDATION');
  expect((await db.query('select * from public.group_members')).rows).toHaveLength(1);
  await expect(db.query("select public.create_tournament('X',array['é','é','Cy'])")).rejects.toThrow('VALIDATION');
  const id = await create();
  const first = await snapshot(id);
  const metadata = (await db.query<{ last_editor: string; updated_at: string }>('select last_editor,updated_at from public.tournaments where id=$1', [id])).rows[0];
  expect(metadata.last_editor).toBe(member);
  expect(metadata.updated_at).toBeTruthy();
  expect((await db.query<{ title: string; created_at: string }>('select title,created_at from public.private_groups')).rows[0].title).toBe('The Birmingham Private League');
  for (const table of ['private_groups','group_members','tournaments','players','matches','match_results']) {
    await expect(db.query(`delete from public.${table}`)).rejects.toThrow(/permission denied/);
    await expect(db.query(`truncate public.${table} cascade`)).rejects.toThrow(/permission denied/);
  }
  expect(first.players).toHaveLength(3); expect(first.matches).toHaveLength(10); expect(first.version).toBe(0);
  await expect(create()).rejects.toThrow('ACTIVE_TOURNAMENT_EXISTS');
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
  expect((await db.query<{value:{items:Tournament[];nextCursor:string|null}}>('select public.list_tournaments($1,1) as value',[successor])).rows[0].value.items[0].id).toBe(id);
  await db.exec('reset role');
  expect((await db.query<{n:number}>('select count(*)::int n from public.match_results where tournament_id=$1',[id])).rows[0].n).toBe(30);
  expect((await db.query<{n:number}>('select sum(points)::int n from public.match_results where tournament_id=$1',[id])).rows[0].n).toBe(150);
  // As administrator, bypass RLS to verify structural constraints independently.
  await expect(db.query('insert into public.match_results(tournament_id,match_number,player_slot,position) values($1,1,4,1)',[successor])).rejects.toThrow(/foreign key/);
  await expect(db.query('insert into public.group_members values($1,$2,4)',[group,outsider])).rejects.toThrow(/check constraint/);
});
