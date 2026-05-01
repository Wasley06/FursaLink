import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminDb, requireFirebaseUser } from '../_lib/firebaseAdmin.js';

export const config = {
  runtime: 'nodejs',
};

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json').send(JSON.stringify(body));
}

function parseAllowList() {
  const raw = process.env.BOOTSTRAP_DEVELOPER_EMAILS || 'wasley.dev@fursalink.znz';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const decoded = await requireFirebaseUser(req);
    const email = String(decoded.email || '').trim().toLowerCase();
    if (!email) return json(res, 403, { error: 'email_required' });

    const allowed = parseAllowList();
    if (!allowed.includes(email)) return json(res, 403, { error: 'not_allowed' });

    const uid = decoded.uid;
    const db = getFirebaseAdminDb();
    const now = new Date();

    const ref = db.doc(`users/${uid}`);
    const existing = await ref.get();
    const createdAt = existing.exists ? (existing.data() as any)?.createdAt || now : now;

    await ref.set(
      {
        fullName: (req.body as any)?.fullName || decoded.name || 'Developer',
        phoneNumber: (req.body as any)?.phoneNumber || '0700000000',
        role: 'developer',
        phoneVerified: true,
        profileProgress: 100,
        createdAt,
        updatedAt: now,
        seededBy: 'api:bootstrap-developer',
      },
      { merge: true },
    );

    return json(res, 200, { ok: true, uid, email, role: 'developer' });
  } catch (e: any) {
    if (String(e?.message || '') === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: e?.message || 'unknown' });
  }
}
