'use client';
import {useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {useLeagueUpdates} from '@/lib/use-league-updates';
export function LeagueRefresh({groupId}:{groupId:string}){const router=useRouter();const refresh=useCallback(()=>router.refresh(),[router]);useLeagueUpdates(groupId,refresh);return null;}
