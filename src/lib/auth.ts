import {redirect} from 'next/navigation';
import {serverClient} from './supabase/server';
import {isConfigured} from './supabase/config';
import {storageError} from './errors';
export async function requireMember(){if(!isConfigured())redirect('/login');const client=await serverClient();const{data:{user},error}=await client.auth.getUser();if(error||!user)redirect('/login');const{data:membership,error:readError}=await client.from('group_members').select('group_id').eq('user_id',user.id).maybeSingle();if(readError)throw storageError(readError);if(!membership)redirect('/access-required');return{client,user,groupId:membership.group_id};}
