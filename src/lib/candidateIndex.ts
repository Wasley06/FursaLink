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
  const u = codeify(input.uid, 6);
  return `ZNZ-${d}-${w}-${u}`;
}

