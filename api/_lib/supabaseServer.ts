import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getSupabaseServer() {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseBuckets() {
  return {
    publicBucket: process.env.SUPABASE_BUCKET_PUBLIC || 'public-assets',
    privateBucket: process.env.SUPABASE_BUCKET_PRIVATE || 'private-assets',
  };
}

