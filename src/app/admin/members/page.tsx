import { logoutAdmin, revokeLeagueMember } from '@/features/admin/actions';
import { TournamentInviteCodeForm } from '@/features/admin/tournament-invite-code-form';
import { AdminTournamentForm } from '@/features/admin/admin-tournament-form';
import { requireAdmin } from '@/lib/admin-session';
import { adminDatabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { email } = await requireAdmin();
  const { error, updated } = await searchParams;
  const client = adminDatabaseClient();
  const [{ data: memberships, error: membersError }, { data: tournaments, error: tournamentsError }] = await Promise.all([
    client.rpc('admin_list_league_members'),
    client.rpc('admin_list_league_tournaments'),
  ]);
  if (membersError || tournamentsError || !memberships || !tournaments) throw new Error('Could not load membership administration data.');
  const activeCount = memberships.filter((member) => member.status === 'active').length;

  return <main className="content-shell">
    <header className="page-header">
      <div><p className="eyebrow">BRASS LEAGUE ADMIN</p><h1>Member access</h1><p>Signed in as <bdi dir="ltr">{email}</bdi>. {activeCount.toLocaleString('en-GB')} active member{activeCount === 1 ? '' : 's'}.</p></div>
      <form action={logoutAdmin}><button className="button secondary">Sign out</button></form>
    </header>
    {updated && <p role="status">Member access revoked.</p>}
    {error && <p className="error-message" role="alert">Could not revoke this membership.</p>}
    <section className="panel">
      <h2>Create a tournament</h2>
      <p>Create a tournament and its private registration code. Players can register with the code and enter its roster.</p>
      <AdminTournamentForm />
    </section>
    <section className="panel">
      <h2>Tournament invite codes</h2>
      <p>Create a separate reusable registration code for each tournament.</p>
      {tournaments.length === 0 ? <p>No tournaments yet.</p> : <div className="table-wrap"><table>
        <thead><tr><th>Tournament</th><th>Created</th><th>Invite code</th></tr></thead>
        <tbody>{tournaments.map((tournament) => <tr key={tournament.id}>
          <td>{tournament.title}</td>
          <td>{new Date(tournament.created_at).toLocaleDateString('en-GB')}</td>
          <td>{tournament.can_invite
            ? <TournamentInviteCodeForm tournamentId={tournament.id} hasCode={Boolean(tournament.code_updated_at)} />
            : <span>Roster locked after first result</span>}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <section className="panel">
      <h2>League memberships</h2>
      {memberships.length === 0 ? <p>No league members yet.</p> : <div className="table-wrap"><table>
        <thead><tr><th>Member</th><th>Email</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{memberships.map((member) => <tr key={member.user_id}>
          <td>{member.display_name ?? 'Profile not set'}</td>
          <td><bdi dir="ltr">{member.email ?? member.user_id}</bdi></td>
          <td>{member.status}</td>
          <td>{member.status === 'active' && <form action={revokeLeagueMember}>
            <input type="hidden" name="userId" value={member.user_id} />
            <button className="button secondary">Revoke</button>
          </form>}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </main>;
}
