import {createBrowserClient} from '@supabase/ssr';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {supabaseConfig} from './config';
let instance:SupabaseClient<Database>|undefined;
export function browserClient():SupabaseClient<Database>{if(!instance){const{url,key}=supabaseConfig();instance=createBrowserClient<Database>(url,key);}return instance;}
