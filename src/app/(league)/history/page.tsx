import {requireMember} from '@/lib/auth';
import {listTournaments} from '@/lib/repository';
import {loadHistoryAction} from '@/lib/actions';
import {HistoryList} from '@/features/history/history-list';
export default async function HistoryPage(){const{client}=await requireMember();const initial=await listTournaments(client);return <HistoryList key={initial.items.map(t=>`${t.id}:${t.version}`).join(',')} initial={initial} loadMore={loadHistoryAction}/>;}
