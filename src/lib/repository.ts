import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './database.types';
import {validateNames,validatePlacements,type PlayerSlot,type Tournament} from '@/domain/tournament';
import {LedgerError,storageError} from './errors';
type Client=SupabaseClient<Database>;
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
export const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
/** Validate the coherent SQL snapshot at the remote boundary. */
export function decodeTournament(value:unknown):Tournament{
  if(!isRecord(value)||typeof value.id!=='string'||typeof value.groupId!=='string'||typeof value.title!=='string'||typeof value.version!=='number'||!Number.isInteger(value.version)||value.version<0||typeof value.createdAt!=='string'||!(value.completedAt===null||typeof value.completedAt==='string')||!Array.isArray(value.players)||!Array.isArray(value.matches))throw new LedgerError('UNAVAILABLE');
  const players=value.players.map(player=>{if(!isRecord(player)||![1,2,3].includes(Number(player.slot))||typeof player.slot!=='number'||typeof player.name!=='string')throw new LedgerError('UNAVAILABLE');return{slot:player.slot as PlayerSlot,name:player.name};}).sort((a,b)=>a.slot-b.slot);
  if(players.length!==3||new Set(players.map(p=>p.slot)).size!==3)throw new LedgerError('UNAVAILABLE');validateNames(players.map(p=>p.name));
  const matches=value.matches.map(match=>{if(!isRecord(match)||typeof match.number!=='number'||!Number.isInteger(match.number)||match.number<1||match.number>10||!(match.playedAt===null||typeof match.playedAt==='string'))throw new LedgerError('UNAVAILABLE');return{number:match.number,playedAt:match.playedAt,placements:match.placements===null?null:validatePlacements(match.placements,players)};}).sort((a,b)=>a.number-b.number);
  if(matches.length!==10||new Set(matches.map(m=>m.number)).size!==10)throw new LedgerError('UNAVAILABLE');let unplayed=false;for(const match of matches){if(!match.placements)unplayed=true;else if(unplayed)throw new LedgerError('UNAVAILABLE');}
  return{id:value.id,groupId:value.groupId,title:value.title,version:value.version,createdAt:value.createdAt,completedAt:value.completedAt,players,matches};
}
export async function readTournament(client:Client,id:string):Promise<Tournament|null>{if(!isUuid(id))return null;const{data,error}=await client.rpc('read_tournament',{p_id:id});if(error){const mapped=storageError(error);if(mapped.code==='NOT_FOUND')return null;throw mapped;}return data===null?null:decodeTournament(data);}
export interface TournamentPage{items:Tournament[];nextCursor:string|null}
export async function listTournaments(client:Client,cursor?:string):Promise<TournamentPage>{if(cursor&&!isUuid(cursor))throw new LedgerError('VALIDATION');const{data,error}=await client.rpc('list_tournaments',{p_cursor:cursor??undefined,p_limit:10});if(error)throw storageError(error);if(!isRecord(data)||!Array.isArray(data.items)||!(data.nextCursor===null||typeof data.nextCursor==='string'))throw new LedgerError('UNAVAILABLE');return{items:data.items.map(decodeTournament),nextCursor:data.nextCursor};}
