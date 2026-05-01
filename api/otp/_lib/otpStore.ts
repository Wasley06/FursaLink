import crypto from 'node:crypto';
import { getFirebaseAdminDb } from '../../_lib/firebaseAdmin.js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getOtpSecret() {
  return process.env.OTP_SECRET || requireEnv('FIREBASE_ADMIN_PROJECT_ID');
}

export function normalizeDigits(raw: string) {
  return String(raw || '').replace(/[^\d+]/g, '');
}

export function normalizeTzPhoneE164(raw: string) {
  const digits = normalizeDigits(raw);
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `+255${digits.slice(1)}`;
  if (digits.startsWith('255') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+255${digits}`;
  return `+${digits.replace(/^\+/, '')}`;
}

export function makeOtpCode(len = 6) {
  const n = Math.max(4, Math.min(8, len));
  let out = '';
  for (let i = 0; i < n; i++) out += String(Math.floor(Math.random() * 10));
  return out;
}

export function hashOtp(code: string, salt: string) {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

export function otpDocId(purpose: string, key: string) {
  const safePurpose = String(purpose || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'otp';
  const safeKey = String(key || '').replace(/[^a-z0-9_:+-]/gi, '').slice(0, 140);
  return `${safePurpose}__${safeKey}`;
}

export async function readOtpChallenge(docId: string) {
  const db = getFirebaseAdminDb();
  const ref = db.collection('otpChallenges').doc(docId);
  const snap = await ref.get();
  return { ref, snap };
}
