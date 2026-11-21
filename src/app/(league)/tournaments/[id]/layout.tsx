import {notFound} from 'next/navigation';
import {requireMember} from '@/lib/auth';
import {readLeagueTournament} from '@/lib/repository';
import {TournamentProvider} from '@/features/tournament/provider';
export default async function TournamentLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, user } = await requireMember();
  const tournament = await readLeagueTournament(client, id);
  if (!tournament) notFound();
  const { data: profile } = await client.from('member_profiles').select('display_name')
    .eq('user_id', user.id).maybeSingle();
  return <TournamentProvider key={`${user.id}:${tournament.id}`} initial={tournament}
    currentUserId={user.id} initialDisplayName={profile?.display_name ?? null}>
    {children}
  </TournamentProvider>;
}
