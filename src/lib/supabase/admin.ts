import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { supabaseConfig } from './config';

/** Privileged client: import only from server routes/actions, never client components. */
export function adminDatabaseClient() {
  const { url } = supabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey || secretKey.startsWith('replace-')) throw new Error('Server-side Supabase administration is not configured.');
  return createClient<Database>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
