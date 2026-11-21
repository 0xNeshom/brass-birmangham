import {requireMember} from '@/lib/auth';
import {listLeagueTournaments} from '@/lib/repository';
import {loadLeagueHistoryAction} from '@/lib/actions';
import {HistoryList} from '@/features/history/history-list';
export default async function HistoryPage(){const{client}=await requireMember();const initial=await listLeagueTournaments(client);return <HistoryList key={initial.items.map(t=>`${t.id}:${t.version}`).join(',')} initial={initial} loadMore={loadLeagueHistoryAction}/>;}
