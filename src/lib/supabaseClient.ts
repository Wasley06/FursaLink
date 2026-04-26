import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClientConfig = {
  url: string;
  anonKey: string;
  publicBucket: string;
  privateBucket: string;
};

export function getSupabaseClientConfig(): SupabaseClientConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return {
    url,
    anonKey,
    publicBucket: (import.meta.env.VITE_SUPABASE_BUCKET_PUBLIC as string | undefined) || 'public-assets',
    privateBucket: (import.meta.env.VITE_SUPABASE_BUCKET_PRIVATE as string | undefined) || 'private-assets',
  };
}

let cached: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseClientConfig();
  if (!cfg) return null;
  if (!cached) {
    cached = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return cached;
}

