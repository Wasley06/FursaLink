export function formatDateDdMmYyyy(input: any): string {
  if (!input) return '—';
  // Firestore Timestamp
  if (typeof input?.toDate === 'function') {
    return formatDateDdMmYyyy(input.toDate());
  }
  // JS Date
  if (input instanceof Date) {
    const d = input;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  const s = String(input).trim();
  // ISO date yyyy-mm-dd
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  // Fallback parse
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return formatDateDdMmYyyy(dt);
  return s;
}

