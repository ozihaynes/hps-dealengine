import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-side only

export function createAdminClient() {
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}
