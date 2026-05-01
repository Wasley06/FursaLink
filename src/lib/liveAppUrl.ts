const DEFAULT_LIVE_URL = 'https://fursalink-zanzibar.vercel.app';

export function getLiveAppUrl() {
  const fromElectron = typeof window !== 'undefined' ? window.FursaLink?.appUrl : null;
  const fromEnv = (import.meta as any)?.env?.VITE_LIVE_APP_URL as string | undefined;
  const url = fromElectron || fromEnv || DEFAULT_LIVE_URL;
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

