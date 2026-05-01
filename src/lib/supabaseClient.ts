import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClientConfig = {
  url: string;
  anonKey: string;
  publicBucket: string;
  privateBucket: string;
};

function normalizeSupabaseUrl(raw: string) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const noSlash = trimmed.replace(/\/+$/, '');
  return noSlash;
}

function isLikelyValidSupabaseProjectUrl(url: string) {
  // Expected: https://<ref>.supabase.co
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
}

export function getSupabaseClientConfig(): SupabaseClientConfig | null {
  const urlRaw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const url = urlRaw ? normalizeSupabaseUrl(urlRaw) : '';
  if (!url || !anonKey) return null;
  // Common misconfig: pasting https://<ref>.supabase.co/auth/v1 or similar.
  if (!isLikelyValidSupabaseProjectUrl(url)) return null;
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
