'use server';
import {revalidatePath} from 'next/cache';
import {unstable_rethrow} from 'next/navigation';
import {requireMember} from './auth';
import {validateNames,validatePlacements,type PlayerSlot} from '@/domain/tournament';
import {LedgerError,storageError,type ActionResult} from './errors';
import {isUuid,listTournaments} from './repository';
async function result<T>(work:()=>Promise<T>):Promise<ActionResult<T>>{try{return{ok:true,value:await work()};}catch(error){unstable_rethrow(error);return{ok:false,code:error instanceof LedgerError?error.code:'UNAVAILABLE'};}}
function cleanNames(names:string[]){try{return validateNames(names);}catch{throw new LedgerError('VALIDATION');}}
export async function createTournamentAction(title:string,names:string[]):Promise<ActionResult<string>>{return result(async()=>{const{client}=await requireMember();const cleaned=cleanNames(names);if(typeof title!=='string'||!title.trim()||Array.from(title.trim()).length>80)throw new LedgerError('VALIDATION');const{data,error}=await client.rpc('create_tournament',{p_title:title.trim(),p_names:cleaned});if(error)throw storageError(error);if(!data)throw new LedgerError('UNAVAILABLE');revalidatePath('/');revalidatePath('/history');return data;});}
export async function saveResultAction(id:string,number:number,placements:PlayerSlot[],version:number):Promise<ActionResult<null>>{return result(async()=>{const{client}=await requireMember();try{validatePlacements(placements);}catch{throw new LedgerError('VALIDATION');}if(!isUuid(id)||!Number.isInteger(number)||number<1||number>10||!Number.isInteger(version))throw new LedgerError('VALIDATION');const{error}=await client.rpc('save_match_result',{p_tournament_id:id,p_match_number:number,p_placements:placements,p_expected_version:version});if(error)throw storageError(error);revalidatePath(`/tournaments/${id}`);revalidatePath('/history');return null;});}
export async function renamePlayersAction(id:string,names:string[],version:number):Promise<ActionResult<null>>{return result(async()=>{const{client}=await requireMember();const cleaned=cleanNames(names);if(!isUuid(id)||!Number.isInteger(version))throw new LedgerError('VALIDATION');const{error}=await client.rpc('rename_players',{p_tournament_id:id,p_names:cleaned,p_expected_version:version});if(error)throw storageError(error);revalidatePath(`/tournaments/${id}`);revalidatePath('/history');return null;});}
export async function loadHistoryAction(cursor:string){const{client}=await requireMember();return listTournaments(client,cursor);}
