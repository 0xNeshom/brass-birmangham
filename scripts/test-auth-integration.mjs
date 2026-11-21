/** Local GoTrue/Postgres integration test. It retains its uniquely named fixtures. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.TEST_SUPABASE_URL;
const secretKey = process.env.TEST_SUPABASE_SECRET_KEY;
const publishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const acknowledged = process.env.BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS === '1';

function isDisposableLocal(raw) {
  try {
    const target = new URL(raw);
    return target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
      && target.port === '54321' && !target.username && !target.password
      && (target.pathname === '/' || target.pathname === '') && !target.search && !target.hash;
  } catch { return false; }
}

if (!acknowledged) throw new Error('Set BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS=1 only for a disposable local Supabase project.');
if (!url || !isDisposableLocal(url)) throw new Error('Refusing Auth tests unless TEST_SUPABASE_URL is plain HTTP loopback on port 54321.');
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error('TEST_SUPABASE_URL must exactly match NEXT_PUBLIC_SUPABASE_URL.');
if (!secretKey || !publishableKey) throw new Error('Missing local Supabase test API keys.');

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, secretKey, options);
const player = createClient(url, publishableKey, options);
const runId = randomUUID();
const approvedEmail = `approved-${runId}@example.test`;
const rejectedEmail = `rejected-${runId}@example.test`;
const password = `${randomUUID()}Aa1!`;
const actor = 'local-integration@example.test';
const mailpit = 'http://127.0.0.1:54324';

function ok({ data, error }) {
  if (error) throw new Error(`Local Supabase operation failed: ${error.code ?? 'unknown'}`);
  return data;
}

async function findConfirmationToken(email) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(`${mailpit}/api/v1/messages?limit=100`);
    assert.equal(response.ok, true, 'Mailpit local API must be reachable');
    const listing = await response.json();
    const messages = listing.messages ?? [];
    for (const message of messages) {
      const id = message.ID ?? message.id;
      if (!id) continue;
      const recipients = (message.To ?? []).map((recipient) =>
        typeof recipient === 'string' ? recipient : recipient.Address ?? '',
      );
      if (!recipients.some((recipient) => recipient.toLowerCase() === email.toLowerCase())) continue;
      const detailResponse = await fetch(`${mailpit}/api/v1/message/${encodeURIComponent(id)}`);
      if (!detailResponse.ok) continue;
      const detail = await detailResponse.json();
      const body = `${detail.HTML ?? ''}\n${detail.Text ?? ''}`;
      for (const candidate of body.match(/https?:\/\/[^\s"'<>]+/g) ?? []) {
        try {
          const link = new URL(candidate.replaceAll('&amp;', '&').replaceAll('&#x3D;', '='));
          const token = link.searchParams.get('token_hash') ?? link.searchParams.get('token');
          if (token && (link.searchParams.get('type') === 'signup' || link.searchParams.get('type') === 'email')) return token;
        } catch { /* Ignore non-URL template text. */ }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('No local email confirmation token arrived in Mailpit.');
}

// Supabase Before User Created Hook must reject before Auth persists a user.
const rejected = await player.auth.signUp({ email: rejectedEmail, password });
assert(rejected.error, 'The real local Auth hook must reject an unapproved signup.');
const usersAfterRejection = ok(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }));
assert.equal(usersAfterRejection.users.some((user) => user.email === rejectedEmail), false, 'Rejected signup must not create auth.users row.');
const rejectedAllowlist = ok(await admin.from('allowed_emails').select('email_normalized').eq('email_normalized', rejectedEmail).maybeSingle());
assert.equal(rejectedAllowlist, null, 'Rejected signup must not create or mutate an allowlist row.');

// Server-role allowlisting plus direct public signup exercises GoTrue and its database hook.
assert.equal(ok(await admin.rpc('admin_approve_email', { p_email: approvedEmail, p_actor: actor })), 'approved');
const signup = await player.auth.signUp({
  email: approvedEmail,
  password,
  options: { emailRedirectTo: 'http://localhost:3000/auth/confirm?next=/dashboard' },
});
assert.equal(signup.error, null, 'Approved signup should be accepted by local Auth.');
assert(signup.data.user?.id, 'Approved signup should create an Auth user.');
assert.equal(signup.data.session, null, 'Email confirmation must be required before a session is issued.');
const approvedState = ok(await admin.from('allowed_emails').select('status,auth_user_id').eq('email_normalized', approvedEmail).single());
assert.equal(approvedState.status, 'pending_verification');
assert.equal(approvedState.auth_user_id, null);
assert.equal(ok(await admin.from('group_members').select('user_id').eq('user_id', signup.data.user.id).maybeSingle()), null, 'Membership must not activate before verification.');
const prematureActivation = await player.rpc('activate_verified_membership');
assert(prematureActivation.error, 'Anonymous activation must fail.');

// Verify the actual local confirmation message token through GoTrue, then activate atomically.
const tokenHash = await findConfirmationToken(approvedEmail);
const verified = await player.auth.verifyOtp({ token_hash: tokenHash, type: 'signup' });
assert.equal(verified.error, null, 'GoTrue should accept the Mailpit confirmation token.');
assert(verified.data.session?.access_token, 'Verification should establish an authenticated session.');
assert(verified.data.user?.email_confirmed_at, 'GoTrue should mark the email confirmed.');
const groupId = ok(await player.rpc('activate_verified_membership'));
assert(groupId, 'Verified account should activate into the private league.');
const membership = ok(await admin.from('group_members').select('status,group_id').eq('user_id', signup.data.user.id).single());
assert.equal(membership.status, 'active');
assert.equal(membership.group_id, groupId);
assert.equal(ok(await admin.from('allowed_emails').select('status,auth_user_id').eq('email_normalized', approvedEmail).single()).status, 'active');

// A valid but stale Auth session must lose database access immediately on revocation.
assert.equal(ok(await admin.rpc('admin_revoke_email', { p_email: approvedEmail, p_actor: actor })), null);
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

console.log('Local Auth integration passed: actual signup hook deny/allow, no pre-verification membership, Mailpit email confirmation, activation, stale-session RLS revocation, and admin-session RPC authorization. Synthetic records retained in the disposable local database.');
