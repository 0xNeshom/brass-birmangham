'use client';
import Link from 'next/link';
import {createContext,useContext,useState,useCallback,type ReactNode} from 'react';
import {ArrowLeft} from 'lucide-react';
import {type Tournament,type PlayerSlot,completedCount,validateMatchSave,validateNames} from '@/domain/tournament';
import {browserClient} from '@/lib/supabase/browser';
import {readTournament} from '@/lib/repository';
import {saveResultAction,renamePlayersAction} from '@/lib/actions';
import {LedgerError} from '@/lib/errors';
import {useLeagueUpdates} from '@/lib/use-league-updates';
import {Dashboard} from './dashboard';
import {IndustrialHero} from '@/scene/industrial-hero';
import {Statistics} from '@/features/statistics/statistics';

interface TournamentContextValue{tournament:Tournament;refresh:()=>Promise<void>;connection:string;error:string;refreshing:boolean}
const TournamentContext=createContext<TournamentContextValue|null>(null);
export function useTournament(){const value=useContext(TournamentContext);if(!value)throw new Error('Tournament provider missing');return value;}
export function TournamentProvider({initial,children}:{initial:Tournament;children:ReactNode}){
  const [tournament,setTournament]=useState(initial);const[error,setError]=useState('');const[refreshing,setRefreshing]=useState(false);
  const refresh=useCallback(async()=>{
    setRefreshing(true);try{const value=await readTournament(browserClient(),initial.id);if(!value)throw new LedgerError('NOT_FOUND');setTournament(current=>value.version>=current.version?value:current);setError('');}catch(error){setError(error instanceof Error?error.message:'Unable to refresh the shared ledger.');}finally{setRefreshing(false);}
  },[initial.id]);
  const onChange=useCallback(()=>{void refresh();},[refresh]);
  const connection=useLeagueUpdates(initial.groupId,onChange);
  return <TournamentContext.Provider value={{tournament,refresh,connection,error,refreshing}}>{children}</TournamentContext.Provider>;
}
export function TournamentView({statisticsOnly=false}:{statisticsOnly?:boolean}){
  const {tournament,refresh,connection,error,refreshing}=useTournament();
  async function save(number:number,placements:PlayerSlot[],version:number){
    if(!navigator.onLine)throw new Error('You are offline. Reconnect before recording a result.');
    validateMatchSave(tournament,number,placements,version);
    const result=await saveResultAction(tournament.id,number,placements,version);
    if(!result.ok){if(result.code==='VERSION_CONFLICT')await refresh();throw new LedgerError(result.code);}
    await refresh();
  }
  async function rename(names:string[],version:number){
    if(!navigator.onLine)throw new Error('You are offline. Reconnect before changing player names.');validateNames(names);
    const result=await renamePlayersAction(tournament.id,names,version);
    if(!result.ok){if(result.code==='VERSION_CONFLICT')await refresh();throw new LedgerError(result.code);}await refresh();
  }
  if(statisticsOnly)return <><Link className="text-link" href={`/tournaments/${tournament.id}`}><ArrowLeft size={15}/>Back to the ledger</Link><div className="page-heading"><div><p className="eyebrow">{tournament.title} · {completedCount(tournament)} / 10 matches</p><h1>The campaign, in numbers.</h1><p className="muted">Every finish. Every point. The whole story at the table.</p></div><span className="muted" style={{fontSize:12}}>{connection}</span></div>{error&&<p className="error-message" role="alert">{error}</p>}<Statistics tournament={tournament} full/></>;
  return <Dashboard tournament={tournament} onSave={save} onRename={rename} onRefresh={()=>void refresh()} connection={connection} refreshing={refreshing} error={error} hero={<IndustrialHero completed={completedCount(tournament)===10}/>} charts={<Statistics tournament={tournament}/>}/>;
}
