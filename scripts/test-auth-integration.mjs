/** Local GoTrue/Postgres integration test. It retains its uniquely named fixtures. */
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.TEST_SUPABASE_URL;
const secretKey = process.env.TEST_SUPABASE_SECRET_KEY;
const publishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const acknowledged = process.env.BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS === '1';

const project = 'brass-invite-it';
const localUrl = 'http://127.0.0.1:54351';
assert(acknowledged, 'Explicitly opt into the disposable local test.');
assert.equal(process.env.BRASS_EXPECTED_LOCAL_PROJECT_ID, project);
assert.equal(url, localUrl);
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, localUrl);
assert(secretKey && publishableKey, 'Missing local Supabase test API keys.');
const kong = `supabase_kong_${project}`;
const label = execFileSync('docker', ['inspect', '--format', '{{index .Config.Labels "com.supabase.cli.project"}}', kong], { encoding: 'utf8' }).trim();
assert.equal(label, project);
const ports = execFileSync('docker', ['inspect', '--format', '{{json (index .NetworkSettings.Ports "8000/tcp")}}', kong], { encoding: 'utf8' });
assert.deepEqual(JSON.parse(ports), [{ HostIp: '127.0.0.1', HostPort: '54351' }]);

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, secretKey, options);
const player = createClient(url, publishableKey, options);
const runId = randomUUID();
const approvedEmail = `approved-${runId}@example.test`;
const rejectedEmail = `rejected-${runId}@example.test`;
const password = `${randomUUID()}Aa1!`;
const actor = 'local-integration@example.test';
const hash = () => createHash('sha256').update(randomBytes(24)).digest('hex');

function ok({ data, error }) {
  if (error) throw new Error(`Local Supabase operation failed: ${error.code ?? 'unknown'}`);
  return data;
}

// Public signup stays disabled while the privileged creation path remains available.
const rejected = await player.auth.signUp({ email: rejectedEmail, password });
assert(rejected.error, 'Direct public signup must be rejected.');
assert.equal(ok(await admin.auth.admin.listUsers()).users.some((user) => user.email === rejectedEmail), false);

const oldHash = hash();
const currentHash = hash();
const tournamentId = ok(await admin.rpc('admin_create_league_tournament', {
  p_title: `Auth integration ${runId}`, p_code_hash: oldHash, p_actor: actor,
}));
const rotate = (value) => admin.rpc('rotate_tournament_invite', {
  p_tournament_id: tournamentId, p_code_hash: value, p_actor: actor,
});
const lookup = async (value) => (ok(await admin.rpc('lookup_tournament_invite', { p_code_hash: value })) ?? [])[0] ?? null;
const oldInvite = await lookup(oldHash);
assert(oldInvite?.invite_id);
ok(await rotate(currentHash));
assert.equal(await lookup(oldHash), null);
const currentInvite = await lookup(currentHash);
assert(currentInvite?.invite_id);
assert.notEqual(currentInvite.invite_id, oldInvite.invite_id);
assert((await player.rpc('lookup_tournament_invite', { p_code_hash: currentHash })).error, 'Browser roles must not query invites.');

const create = (invite) => admin.auth.admin.createUser({
  email: approvedEmail, password, email_confirm: true,
  app_metadata: { brass_tournament_invite_id: invite },
  user_metadata: { display_name: `Auth ${runId}` },
});
assert((await create(oldInvite.invite_id)).error, 'Rotated enrollment must roll back Auth account creation.');
const { user } = ok(await create(currentInvite.invite_id));
assert(user?.id);
const membership = ok(await admin.from('group_members').select('status').eq('user_id', user.id).single());
assert.equal(membership.status, 'active');
const rosterEntry = ok(await admin.from('players').select('tournament_id,member_user_id').eq('member_user_id', user.id).single());
assert.equal(rosterEntry.tournament_id, tournamentId);
assert(ok(await player.auth.signInWithPassword({ email: approvedEmail, password })).session);
ok(await player.rpc('list_league_tournaments'));

// A valid but stale Auth session must lose database access immediately on revocation.
assert.equal(ok(await admin.rpc('admin_revoke_league_member', { p_user_id: user.id, p_actor: actor })), null);
const afterRevoke = await player.rpc('list_league_tournaments');
assert.match(afterRevoke.error?.message ?? '', /FORBIDDEN/);
assert.deepEqual(ok(await player.from('tournaments').select('id')), []);

// Admin session records are server-role only and revocable in the database.
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const sessionId = ok(await admin.rpc('create_admin_session', { p_expires_at: expiresAt }));
assert.equal(ok(await admin.rpc('validate_admin_session', { p_session_id: sessionId })), true);
assert.equal((await player.rpc('validate_admin_session', { p_session_id: sessionId })).error !== null, true, 'Browser roles must not validate admin sessions.');
ok(await admin.rpc('revoke_admin_session', { p_session_id: sessionId }));
assert.equal(ok(await admin.rpc('validate_admin_session', { p_session_id: sessionId })), false);

console.log('Local Auth integration passed: direct signup rejection, rotation, atomic activation, password login, revoked-session RLS, and admin authorization.');
