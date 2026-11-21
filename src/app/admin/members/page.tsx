import { approveEmail, logoutAdmin, revokeEmail } from '@/features/admin/actions';
import { requireAdmin } from '@/lib/admin-session';
import { adminDatabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { email } = await requireAdmin();
  const { error, updated } = await searchParams;
  const client = adminDatabaseClient();
  const [{ data: approvals, error: approvalsError }, { data: memberships, error: membersError }, { data: profiles, error: profilesError }] = await Promise.all([
    client.from('allowed_emails').select('email_normalized,status,auth_user_id,created_at,updated_at').order('created_at', { ascending: false }),
    client.from('group_members').select('user_id,status,revoked_at').order('user_id'),
    client.from('member_profiles').select('user_id,display_name'),
  ]);
  if (approvalsError || membersError || profilesError) throw new Error('Could not load membership administration data.');
  if (!approvals || !memberships || !profiles) throw new Error('Could not load membership administration data.');
  const namesByUser = new Map(profiles.map((profile) => [profile.user_id, profile.display_name]));
  const activeCount = memberships.filter((member) => member.status === 'active').length;
  return <main className="content-shell">
    <header className="page-header"><div><p className="eyebrow">BRASS LEAGUE ADMIN</p><h1>Member access</h1><p>Signed in as {email}. {activeCount} active member{activeCount === 1 ? '' : 's'}.</p></div>
      <form action={logoutAdmin}><button className="button secondary">Sign out</button></form>
    </header>
    {updated && <p role="status">Access list updated.</p>}
    {error && <p className="error-message" role="alert">{error === 'invalid' ? 'Enter a valid email address.' : 'The request could not be completed.'}</p>}
    <section className="panel"><h2>Approve an email</h2><p>Approved addresses can register. Membership activates only after email verification.</p>
      <form action={approveEmail} className="inline-form"><label htmlFor="approved-email">Email address</label><input id="approved-email" name="email" type="email" maxLength={254} required /><button className="button">Approve</button></form>
    </section>
    <section className="panel"><h2>Registration status</h2>
      {approvals.length === 0 ? <p>No approved addresses yet.</p> : <div className="table-wrap"><table><thead><tr><th>Email</th><th>Status</th><th>Auth user</th><th>Updated</th><th>Action</th></tr></thead><tbody>
        {approvals.map((entry) => <tr key={entry.email_normalized}><td>{entry.email_normalized}</td><td>{entry.status}</td><td>{entry.auth_user_id ? `${entry.auth_user_id.slice(0, 8)}…` : '—'}</td><td>{new Date(entry.updated_at).toLocaleDateString()}</td><td>{entry.status !== 'revoked' && <form action={revokeEmail}><input type="hidden" name="email" value={entry.email_normalized} /><button className="button secondary">Revoke</button></form>}</td></tr>)}
      </tbody></table></div>}
    </section>
    <section className="panel"><h2>League memberships</h2>
      {memberships.length === 0 ? <p>No Auth users have activated membership.</p> : <div className="table-wrap"><table><thead><tr><th>Member</th><th>Auth user</th><th>Status</th><th>Revoked at</th></tr></thead><tbody>{memberships.map((member) => <tr key={member.user_id}><td>{namesByUser.get(member.user_id) ?? 'Profile not set'}</td><td>{member.user_id}</td><td>{member.status}</td><td>{member.revoked_at ? new Date(member.revoked_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
