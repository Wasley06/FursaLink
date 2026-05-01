import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminDb } from '../_lib/firebaseAdmin.js';
import { verifyRecaptchaToken } from '../_lib/recaptcha.js';
import { sendSms } from '../_lib/sms.js';
import { getOtpSecret, hashOtp, makeOtpCode, normalizeTzPhoneE164, otpDocId, readOtpChallenge } from './_lib/otpStore.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const phone = String((req.body as any)?.phone || '').trim();
    const e164 = normalizeTzPhoneE164(phone);
    if (!e164 || e164.length < 8) return json(res, 400, { error: 'invalid_phone' });

    const recaptchaToken = String((req.body as any)?.recaptchaToken || '').trim();
    const captcha = await verifyRecaptchaToken({ token: recaptchaToken });
    if (!captcha.ok) return json(res, 400, { error: 'recaptcha_failed', detail: captcha.error });

    const docId = otpDocId('reset_password', e164);
    const { ref, snap } = await readOtpChallenge(docId);
    const now = Date.now();
    const cooldownSec = Number(process.env.OTP_COOLDOWN_SEC || 60);
    const ttlSec = Number(process.env.OTP_EXPIRES_SEC || 600);
    const len = Number(process.env.OTP_CODE_LENGTH || 6);

    if (snap.exists) {
      const data = snap.data() as any;
      const sentAt = typeof data?.sentAtMs === 'number' ? data.sentAtMs : 0;
      if (sentAt && now - sentAt < cooldownSec * 1000) {
        const remaining = Math.max(1, Math.ceil((cooldownSec * 1000 - (now - sentAt)) / 1000));
        return json(res, 429, { error: 'cooldown', remainingSec: remaining });
      }
    }

    // Best-effort lookup so we can reset password by uid on confirm.
    const db = getFirebaseAdminDb();
    let uid: string | null = null;
    try {
      const snapUsers = await db
        .collection('users')
        .where('role', '==', 'candidate')
        .where('phoneNumber', '==', phone)
        .limit(1)
        .get();
      uid = snapUsers.empty ? null : snapUsers.docs[0].id;
    } catch {
      uid = null;
    }

    const code = makeOtpCode(len);
    const secret = getOtpSecret();
    const codeHash = hashOtp(code, secret);

    await ref.set(
      {
        purpose: 'reset_password',
        phone: e164,
        phoneRaw: phone,
        uid,
        codeHash,
        sentAtMs: now,
        expiresAtMs: now + ttlSec * 1000,
        attempts: 0,
        updatedAtMs: now,
      },
      { merge: true },
    );

    await sendSms({
      to: e164,
      body: `FursaLink password reset OTP: ${code}. Expires in ${Math.round(ttlSec / 60)} minutes.`,
    });

    return json(res, 200, { ok: true, cooldownSec });
  } catch (e: any) {
    return json(res, 500, { error: 'server_error', detail: String(e?.message || '').slice(0, 240) });
  }
}
