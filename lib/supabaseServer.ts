// lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function sbWithClientId(clientId: string) {
  return createClient(url, anon, { global: { headers: { 'x-client-id': clientId } } });
}
