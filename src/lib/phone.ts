export function normalizeTzPhoneE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  // Tanzania local: 0XXXXXXXXX (10 digits)
  if (digits.startsWith('0') && digits.length === 10) return `+255${digits.slice(1)}`;
  // Already without leading 0: 255XXXXXXXXX or 7XXXXXXXX
  if (digits.startsWith('255') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+255${digits}`;
  return `+${digits.replace(/^\+/, '')}`;
}

