import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireFirebaseUser, getFirebaseAdminDb } from '../_lib/firebaseAdmin.js';
import { getOtpSecret, hashOtp, otpDocId, readOtpChallenge } from './_lib/otpStore.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const purpose = String((req.body as any)?.purpose || '').trim();
    if (purpose !== 'verify_phone') return json(res, 400, { error: 'invalid_purpose' });

    const user = await requireFirebaseUser(req as any);
    const code = String((req.body as any)?.code || '').trim();
    if (code.length < 4) return json(res, 400, { error: 'invalid_code' });

    const docId = otpDocId('verify_phone', user.uid);
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

    const phone = String(data?.phone || '');
    await ref.delete().catch(() => {});

    const db = getFirebaseAdminDb();
    await db
      .collection('users')
      .doc(user.uid)
      .set(
        {
          phoneVerified: true,
          phoneE164: phone,
          updatedAt: new Date(),
        },
        { merge: true },
      );

    return json(res, 200, { ok: true });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: msg.slice(0, 240) });
  }
}
