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
    const candidateId = String(body?.candidateId || '').trim();
    const chairmanRemarks = String(body?.chairmanRemarks || '');
    if (!candidateId) return json(res, 400, { error: 'missing_candidate_id' });

    const db = getFirebaseAdminDb();
    const actorSnap = await db.collection('users').doc(uid).get();
    if (!actorSnap.exists) return json(res, 403, { error: 'actor_profile_missing' });
    const actor = actorSnap.data() as any;
    const role = String(actor?.role || '');
    if (!isChairmanRole(role) && !isDeveloperRole(role)) return json(res, 403, { error: 'forbidden' });

    const candidateSnap = await db.collection('users').doc(candidateId).get();
    if (!candidateSnap.exists) return json(res, 404, { error: 'candidate_not_found' });
    const c = candidateSnap.data() as any;

    const approvalId = candidateId;
    await db.collection('administratorApprovals').doc(approvalId).set(
      {
        userId: candidateId,
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
        pushedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      { merge: true },
    );

    await db.collection('administratorApprovalEvents').add({
      approvalId,
      actorId: uid,
      action: 'push',
      message: chairmanRemarks || '',
      createdAt: new Date(),
    });

    return json(res, 200, { ok: true });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: msg.slice(0, 240) });
  }
}

