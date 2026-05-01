import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminDb, requireFirebaseUser } from '../_lib/firebaseAdmin.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function codeify(part: string, len: number) {
  const cleaned = (part || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return 'XX'.slice(0, len);
  return cleaned.slice(0, len).padEnd(len, 'X');
}

function buildRef(district: string, ward: string, seq: number) {
  const d = codeify(district, 3);
  const w = codeify(ward, 3);
  const n = String(Math.max(1, seq)).padStart(5, '0');
  return `FZ-${d}-${w}-${n}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const user = await requireFirebaseUser(req as any);
    const uid = String(user?.uid || '').trim();
    if (!uid) return json(res, 401, { error: 'unauthorized' });

    const db = getFirebaseAdminDb();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) return json(res, 404, { error: 'profile_not_found' });
    const profile = snap.data() as any;
    if (String(profile?.role || '') !== 'candidate') return json(res, 403, { error: 'forbidden' });

    const district = String(profile?.district || '').trim();
    const ward = String(profile?.ward || '').trim();
    if (!district || !ward) return json(res, 400, { error: 'missing_district_or_ward' });

    const existing = String(profile?.candidateIndex || '').trim();
    if (existing.startsWith('FZ-')) return json(res, 200, { ok: true, candidateIndex: existing, reused: true });

    const key = `candidateRef:${codeify(district, 3)}:${codeify(ward, 3)}`;
    const counterRef = db.collection('counters').doc(key);

    const out = await db.runTransaction(async (tx) => {
      const cSnap = await tx.get(counterRef);
      const cur = cSnap.exists ? Number((cSnap.data() as any)?.seq || 0) : 0;
      const next = cur + 1;
      const candidateIndex = buildRef(district, ward, next);
      tx.set(counterRef, { seq: next, updatedAt: new Date() }, { merge: true });
      tx.set(userRef, { candidateIndex, updatedAt: new Date() }, { merge: true });
      return { next, candidateIndex };
    });

    return json(res, 200, { ok: true, candidateIndex: out.candidateIndex, seq: out.next, reused: false });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: msg.slice(0, 240) });
  }
}

