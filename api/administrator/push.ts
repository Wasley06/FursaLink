import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminDb, requireFirebaseUser } from '../_lib/firebaseAdmin.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function isChairmanRole(role: string) {
  const r = String(role || '').trim();
  return ['chairman', 'Chairman', 'admin', 'Admin', 'ADMIN'].includes(r);
}

function isDeveloperRole(role: string) {
  const r = String(role || '').trim();
  return ['developer', 'Developer', 'dev', 'Dev', 'DEV'].includes(r);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const user = await requireFirebaseUser(req as any);
    const uid = String(user?.uid || '').trim();
    if (!uid) return json(res, 401, { error: 'unauthorized' });

    const body = (req.body || {}) as any;
    const chairmanRemarks = String(body?.chairmanRemarks || '');
    const rawOne = String(body?.candidateId || '').trim();
    const rawMany: any[] = Array.isArray(body?.candidateIds) ? (body.candidateIds as any[]) : [];
    const candidateIds = rawOne ? [rawOne] : rawMany.map((x) => String(x || '').trim()).filter(Boolean);
    if (candidateIds.length === 0) return json(res, 400, { error: 'missing_candidate_id' });

    const db = getFirebaseAdminDb();
    const actorSnap = await db.collection('users').doc(uid).get();
    if (!actorSnap.exists) return json(res, 403, { error: 'actor_profile_missing' });
    const actor = actorSnap.data() as any;
    const role = String(actor?.role || '');
    if (!isChairmanRole(role) && !isDeveloperRole(role)) return json(res, 403, { error: 'forbidden' });

    const unique = Array.from(new Set(candidateIds)).slice(0, 500);
    const snaps = await Promise.all(unique.map((id) => db.collection('users').doc(id).get()));

    const batch = db.batch();
    const now = new Date();
    let count = 0;
    for (let i = 0; i < unique.length; i += 1) {
      const id = unique[i];
      const snap = snaps[i];
      if (!snap.exists) continue;
      const c = snap.data() as any;
      const approvalId = id;
      batch.set(
        db.collection('administratorApprovals').doc(approvalId),
        {
          userId: id,
          candidateName: c.fullName || '',
          phoneNumber: c.phoneNumber || '',
          candidateIndex: c.candidateIndex || '',
          district: c.district || '',
          ward: c.ward || '',
          occupation: c.occupation || '',
          dob: c.dob || '',
          status: 'pending',
          chairmanRemarks: chairmanRemarks || '',
          adminNotes: '',
          photoUrl: c.photoUrl || '',
          cvUrl: c.cvUrl || '',
          documentsUrl: c.documentsUrl || '',
          photoRef: c.photoRef || null,
          cvRef: c.cvRef || null,
          documentsRef: c.documentsRef || null,
          idRef: c.idRef || null,
          certificatesRef: c.certificatesRef || null,
          tinRef: c.tinRef || null,
          shehaLetterRef: c.shehaLetterRef || null,
          pushedBy: uid,
          pushedAt: now,
          createdAt: now,
          updatedAt: now,
        } as any,
        { merge: true } as any,
      );
      batch.create(db.collection('administratorApprovalEvents').doc(), {
        approvalId,
        actorId: uid,
        action: 'push',
        message: chairmanRemarks || '',
        createdAt: now,
      } as any);
      count += 1;
    }

    await batch.commit();
    return json(res, 200, { ok: true, count });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: msg.slice(0, 240) });
  }
}
