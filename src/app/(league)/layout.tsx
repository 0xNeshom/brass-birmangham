import {AppShell} from '@/components/app-shell';
import {LeagueRefresh} from '@/components/league-refresh';
import {requireMember} from '@/lib/auth';
export default async function LeagueLayout({children}:{children:React.ReactNode}){const{groupId}=await requireMember();return <AppShell><LeagueRefresh groupId={groupId}/>{children}</AppShell>;}
