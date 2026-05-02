import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminDb, requireFirebaseUser } from '../_lib/firebaseAdmin.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json').end(JSON.stringify(body));
}

function normRole(role: any) {
  return String(role || '').trim().toLowerCase();
}

function isStaff(role: string) {
  return ['controller', 'chairman', 'admin', 'developer', 'dev', 'administrator'].includes(normRole(role));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const decoded = await requireFirebaseUser(req as any);
    const uid = String(decoded?.uid || '').trim();
    if (!uid) return json(res, 401, { error: 'unauthorized' });

    const db = getFirebaseAdminDb();
    const actorSnap = await db.collection('users').doc(uid).get();
    if (!actorSnap.exists) return json(res, 403, { error: 'actor_profile_missing' });
    const actor = actorSnap.data() as any;
    const role = normRole(actor?.role);
    if (!isStaff(role)) return json(res, 403, { error: 'forbidden', detail: `role:${role || 'none'}` });

    const body = (req.body || {}) as any;
    const jobId = String(body?.jobId || '').trim();

    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const qualifications = String(body?.qualifications || '').trim();
    const occupation = String(body?.occupation || '').trim();
    const deadline = String(body?.deadline || '').trim();
    const status = String(body?.status || '').trim().toLowerCase();
    const district = String(body?.district || actor?.district || '').trim();

    if (!title || !description) return json(res, 400, { error: 'missing_fields' });
    const nextStatus = ['published', 'unpublished', 'paused', 'closed'].includes(status) ? status : 'published';

    const now = new Date();
    if (!jobId) {
      const ref = db.collection('jobs').doc();
      await ref.set(
        {
          title,
          description,
          qualifications,
          occupation,
          deadline,
          district,
          controllerId: role === 'controller' ? uid : String(body?.controllerId || uid),
          status: nextStatus,
          createdAt: now,
          updatedAt: now,
        } as any,
        { merge: true } as any,
      );
      return json(res, 200, { ok: true, jobId: ref.id, created: true });
    }

    // Update existing job; controllers can only touch their own jobs.
    const ref = db.collection('jobs').doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return json(res, 404, { error: 'job_not_found' });
    const existing = snap.data() as any;
    if (role === 'controller' && String(existing?.controllerId || '') !== uid) return json(res, 403, { error: 'forbidden' });

    await ref.set(
      {
        title,
        description,
        qualifications,
        occupation,
        deadline,
        district,
        status: nextStatus,
        updatedAt: now,
      } as any,
      { merge: true } as any,
    );
    return json(res, 200, { ok: true, jobId, created: false });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: msg.slice(0, 200) });
  }
}

