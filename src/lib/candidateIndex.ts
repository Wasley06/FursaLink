import type { District } from '../constants/locations';

function codeify(part: string, len: number) {
  const cleaned = (part || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return 'XX'.slice(0, len);
  return cleaned.slice(0, len).padEnd(len, 'X');
}

export function buildCandidateIndex(input: { district?: District | string; ward?: string; uid: string }): string {
  const d = codeify(String(input.district || ''), 3);
  const w = codeify(String(input.ward || ''), 3);
  // Fallback format (official sequence is allocated server-side): FZ-DIST-WARD-00001
  // When offline (or before server allocation), use 00000 placeholder so the format matches.
  return `FZ-${d}-${w}-00000`;
}
