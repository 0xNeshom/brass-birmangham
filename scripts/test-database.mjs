/** One-shot integration test: disposable local Supabase only. Never production. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.TEST_SUPABASE_URL;
const secretKey = process.env.TEST_SUPABASE_SECRET_KEY;
const publicKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const acknowledgment = process.env.BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS === '1';
const apiPort = Number(process.env.BRASS_LOCAL_API_PORT ?? '54321');

function isDisposableLocal(raw, expectedPort) {
  try {
    const target = new URL(raw);
    return target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
      && target.port === String(expectedPort) && !target.username && !target.password
      && (target.pathname === '/' || target.pathname === '') && !target.search && !target.hash;
  } catch { return false; }
}

if (!Number.isInteger(apiPort) || apiPort < 1024 || apiPort > 65535) throw new Error('BRASS_LOCAL_API_PORT must be a valid local API port.');
if (url && !isDisposableLocal(url, apiPort)) throw new Error(`Refusing service-role tests unless TEST_SUPABASE_URL is plain HTTP loopback at port ${apiPort}.`);
if (url && process.env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error('Refusing tests because TEST_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must match exactly.');
if (!acknowledgment) throw new Error('Set BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS=1 only after verifying this is a disposable local Supabase project.');
if (!url || !secretKey || !publicKey) {
  throw new Error('Requires disposable local Supabase: TEST_SUPABASE_URL, TEST_SUPABASE_SECRET_KEY, TEST_SUPABASE_PUBLISHABLE_KEY. Apply migrations first.');
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, secretKey, options);
const anonymous = createClient(url, publicKey, options);
const group = '00000000-0000-4000-8000-000000000001';
const users = [];
function ok(result) { if (result.error) throw result.error; return result.data; }
function errorContains(result, text) { assert(result.error?.message.includes(text), JSON.stringify(result.error)); }
async function makeTournament(client, title) {
  const id = ok(await client.rpc('create_league_tournament', { p_title: title }));
  return id;
}

try {
  // Exact counts avoid PostgREST's default row limit hiding a non-empty database.
  assert.equal((await admin.from('tournaments').select('id', { count: 'exact', head: true })).count, 0, 'Requires an empty disposable database');
  assert.equal((await admin.from('group_members').select('user_id', { count: 'exact', head: true })).count, 0, 'Requires no pre-existing memberships');

  for (let index = 0; index < 6; index++) {
    const email = `db-${randomUUID()}@example.test`;
    const password = `${randomUUID()}Aa1!`;
    const user = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
    users.push({ ...user.user, email, password, client: createClient(url, publicKey, options) });
    ok(await users[index].client.auth.signInWithPassword({ email, password }));
    if (index < 5) ok(await admin.from('group_members').insert({ group_id: group, user_id: users[index].id, member_slot: null }));
  }

  const [a, b, c, d, e, outsider] = users.map((user) => user.client);
  assert((await anonymous.rpc('create_league_tournament', { p_title: 'Unauthorized' })).error, 'Anonymous creation must be denied');
  errorContains(await outsider.rpc('list_league_tournaments', {}), 'FORBIDDEN');
  assert((await a.from('tournaments').insert({ group_id: group, title: 'Direct write' })).error, 'Browser table writes must be denied');

  for (const [index, client] of [a, b, c, d, e].entries()) {
    ok(await client.rpc('set_member_profile', { p_display_name: `Member ${index + 1}` }));
  }
  assert.equal(ok(await e.from('member_profiles').select('display_name').eq('user_id', users[4].id).single()).display_name, 'Member 5');

  // Concurrent tournaments are independent; both creates should commit.
  const [first, second] = await Promise.all([
    makeTournament(a, `Campaign ${randomUUID()}`),
    makeTournament(b, `Campaign ${randomUUID()}`),
  ]);
  const slots = [];
  for (const client of [a, b, c, d, e]) slots.push(ok(await client.rpc('join_tournament_roster', { p_tournament_id: first })));
  assert.deepEqual(slots, [1, 2, 3, 4, 5]);
  ok(await e.rpc('leave_tournament_roster', { p_tournament_id: first }));
  const matchSlots = slots.slice(0, 4);
  errorContains(await a.rpc('select_match_participants', { p_tournament_id: first, p_match_number: 1, p_player_slots: [1, 2, 2, 4] }), 'VALIDATION');
  ok(await a.rpc('select_match_participants', { p_tournament_id: first, p_match_number: 1, p_player_slots: matchSlots }));
  errorContains(await a.rpc('save_league_match_result', { p_tournament_id: first, p_match_number: 3, p_placements: matchSlots, p_expected_version: 0 }), 'VALIDATION');
  ok(await a.rpc('save_league_match_result', { p_tournament_id: first, p_match_number: 1, p_placements: matchSlots, p_expected_version: 0 }));
  const firstRead = ok(await a.rpc('read_league_tournament', { p_id: first }));
  assert.deepEqual(firstRead.matches[0].placements, matchSlots);
  assert.equal(firstRead.rulesVersion, 2);
  errorContains(await a.rpc('select_match_participants', { p_tournament_id: first, p_match_number: 1, p_player_slots: [...matchSlots].reverse() }), 'MATCH_PARTICIPANTS_LOCKED');
  ok(await a.rpc('save_league_match_result', { p_tournament_id: first, p_match_number: 1, p_placements: [...matchSlots].reverse(), p_expected_version: 1 }));
  const corrected = ok(await a.rpc('read_league_tournament', { p_id: first }));
  assert.deepEqual([...corrected.matches[0].participants].sort((left, right) => left - right), matchSlots);
  assert.deepEqual(corrected.matches[0].placements, [...matchSlots].reverse());

  // Complete all ten matches in order; the first player earns the 100-point maximum.
  for (let match = 2; match <= 10; match++) {
    ok(await a.rpc('select_match_participants', { p_tournament_id: first, p_match_number: match, p_player_slots: matchSlots }));
    ok(await a.rpc('save_league_match_result', { p_tournament_id: first, p_match_number: match, p_placements: matchSlots, p_expected_version: match }));
  }
  const completed = ok(await a.rpc('read_league_tournament', { p_id: first }));
  assert(completed.completedAt, 'Ten sequential results must complete the tournament.');
  assert.equal(completed.matches.filter((match) => match.playedAt).length, 10);
  assert.deepEqual(completed.matches[9].participants, matchSlots);
  assert.deepEqual(completed.matches[9].placements, matchSlots);
  const scores = ok(await admin.from('match_participants').select('player_slot,points').eq('tournament_id', first).eq('match_number', 10).order('placement'));
  assert.deepEqual(scores.map(({ points }) => points), [10, 5, 0, 0]);

  // A result in one campaign does not advance the other campaign.
  for (const client of [a, b, c, d, e]) ok(await client.rpc('join_tournament_roster', { p_tournament_id: second }));
  ok(await a.rpc('select_match_participants', { p_tournament_id: second, p_match_number: 1, p_player_slots: slots.slice(0, 4) }));
  ok(await a.rpc('save_league_match_result', { p_tournament_id: second, p_match_number: 1, p_placements: [...slots.slice(0, 4)].reverse(), p_expected_version: 0 }));
  assert.equal(ok(await a.rpc('read_league_tournament', { p_id: first })).matches.filter((match) => match.playedAt).length, 10);
  assert.equal(ok(await a.rpc('read_league_tournament', { p_id: second })).matches.filter((match) => match.playedAt).length, 1);
  assert.equal((await outsider.from('tournaments').select('id')).data.length, 0);

  console.log('Disposable local Supabase integration passed: RLS/write denial, five-member profiles/rosters, roster leave, independent concurrent tournaments, participant locking, sequential ten-match completion, correction, and 10/5/0/0 PostgreSQL scores.');
} finally {
  // The database enforces exact match cardinality and locks played match rows.
  // Retain these fixtures in the disposable stack rather than bypassing guards
  // during teardown. Use a fresh project ID for another run.
  console.log('Disposable integration fixtures retained for inspection; use a fresh local project to rerun.');
}
