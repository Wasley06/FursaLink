import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '../_lib/firebaseAdmin.js';
import { getOtpSecret, hashOtp, normalizeTzPhoneE164, otpDocId, readOtpChallenge } from './_lib/otpStore.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const phone = String((req.body as any)?.phone || '').trim();
    const e164 = normalizeTzPhoneE164(phone);
    const code = String((req.body as any)?.code || '').trim();
    const newPassword = String((req.body as any)?.newPassword || '').trim();
    if (!e164 || e164.length < 8) return json(res, 400, { error: 'invalid_phone' });
    if (code.length < 4) return json(res, 400, { error: 'invalid_code' });
    if (newPassword.length < 8) return json(res, 400, { error: 'weak_password' });

    const docId = otpDocId('reset_password', e164);
    const { ref, snap } = await readOtpChallenge(docId);
    if (!snap.exists) return json(res, 400, { error: 'no_challenge' });

    const data = snap.data() as any;
    const now = Date.now();
    const expiresAtMs = typeof data?.expiresAtMs === 'number' ? data.expiresAtMs : 0;
    if (expiresAtMs && now > expiresAtMs) {
      await ref.delete().catch(() => {});
      return json(res, 400, { error: 'expired' });
    }

    const attempts = typeof data?.attempts === 'number' ? data.attempts : 0;
    if (attempts >= 8) return json(res, 429, { error: 'too_many_attempts' });

    const secret = getOtpSecret();
    const expected = String(data?.codeHash || '');
    const actual = hashOtp(code, secret);
    if (!expected || expected !== actual) {
      await ref.set({ attempts: attempts + 1, updatedAtMs: now }, { merge: true });
      return json(res, 400, { error: 'invalid_code' });
    }

    const uid = typeof data?.uid === 'string' && data.uid ? data.uid : null;
    if (!uid) return json(res, 404, { error: 'user_not_found' });

    const adminAuth = getFirebaseAdminAuth();
    await adminAuth.updateUser(uid, { password: newPassword });

    const db = getFirebaseAdminDb();
    await db.collection('users').doc(uid).set({ updatedAt: new Date() }, { merge: true });

    await ref.delete().catch(() => {});
    return json(res, 200, { ok: true });
  } catch (e: any) {
    return json(res, 500, { error: 'server_error', detail: String(e?.message || '').slice(0, 240) });
  }
}
