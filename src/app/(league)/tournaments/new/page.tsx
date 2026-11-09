import {redirect} from 'next/navigation';
import {requireMember} from '@/lib/auth';
import {listTournaments} from '@/lib/repository';
import {CreateTournament} from '@/features/setup/create-tournament';
export default async function NewTournament(){const{client}=await requireMember();const page=await listTournaments(client);const unfinished=page.items.find(t=>!t.completedAt);if(unfinished)redirect(`/tournaments/${unfinished.id}`);return <CreateTournament/>;}
