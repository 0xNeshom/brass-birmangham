import {notFound} from 'next/navigation';
import {requireMember} from '@/lib/auth';
import {readTournament} from '@/lib/repository';
import {TournamentProvider} from '@/features/tournament/provider';
export default async function TournamentLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){const{id}=await params;const{client}=await requireMember();const tournament=await readTournament(client,id);if(!tournament)notFound();return <TournamentProvider key={tournament.id} initial={tournament}>{children}</TournamentProvider>;}
