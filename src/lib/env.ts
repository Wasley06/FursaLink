export function readViteEnv(key: string): string {
  const val = (import.meta as any).env?.[key];
  return typeof val === 'string' ? val : '';
}

export function readViteEnvBool(key: string, defaultValue: boolean): boolean {
  const raw = readViteEnv(key).trim().toLowerCase();
  if (!raw) return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return defaultValue;
}

