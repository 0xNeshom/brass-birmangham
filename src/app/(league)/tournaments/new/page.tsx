import {requireMember} from '@/lib/auth';
import {CreateLeagueTournament} from '@/features/setup/create-league-tournament';
export default async function NewTournament(){await requireMember();return <CreateLeagueTournament/>;}
