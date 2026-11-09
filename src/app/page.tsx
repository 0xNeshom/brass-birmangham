import {redirect} from 'next/navigation';
import {isConfigured} from '@/lib/supabase/config';
import {ConfigurationRequired} from '@/components/configuration-required';
import {requireMember} from '@/lib/auth';
import {listTournaments} from '@/lib/repository';
export default async function Home(){if(!isConfigured())return <ConfigurationRequired/>;const{client}=await requireMember();const page=await listTournaments(client);redirect(page.items.length?`/tournaments/${page.items[0].id}`:'/tournaments/new');}
