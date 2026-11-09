'use client';
import {createTournamentAction} from '@/lib/actions';
import {LedgerError} from '@/lib/errors';
import {TournamentSetup} from './tournament-setup';
export function CreateTournament(){return <TournamentSetup onCreate={async(title,names)=>{const result=await createTournamentAction(title,names);if(!result.ok)throw new LedgerError(result.code);return result.value;}}/>;}
