import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldPath } from 'firebase-admin/firestore';
import { getFirebaseAdminDb, requireFirebaseUser } from '../_lib/firebaseAdmin.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json').send(JSON.stringify(body));
}

async function requireRole(uid: string, allowed: string[]) {
  const db = getFirebaseAdminDb();
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) throw new Error('profile_missing');
  const role = String(((snap.data() as any)?.role as any) || '')
    .trim()
    .toLowerCase();
  const allow = allowed.map((s) => s.toLowerCase());
  if (!role || !allow.includes(role)) throw new Error(`forbidden:${role || 'none'}`);
  return role;
}

async function forEachDoc<T extends Record<string, any>>(
  colPath: string,
  opts: { where?: [string, FirebaseFirestore.WhereFilterOp, any][]; select?: string[]; pageSize?: number },
  onDoc: (id: string, data: T) => void | Promise<void>,
) {
  const db = getFirebaseAdminDb();
  const pageSize = Math.max(200, Math.min(4000, opts.pageSize ?? 2000));
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  for (let page = 0; page < 25; page += 1) {
    let q: FirebaseFirestore.Query = db.collection(colPath);
    for (const w of opts.where || []) q = q.where(w[0], w[1], w[2]);
    q = q.orderBy(FieldPath.documentId()).limit(pageSize);
    if (cursor) q = q.startAfter(cursor);
    if (opts.select && opts.select.length) q = (q as any).select(...opts.select);

    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) await onDoc(d.id, d.data() as T);
    cursor = snap.docs[snap.docs.length - 1] || null;
    if (!cursor || snap.docs.length < pageSize) break;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const decoded = await requireFirebaseUser(req);
    // Global analytics is visible to all signed-in users (including candidates),
    // but the UI may highlight extra sections for staff roles.
    await requireRole(decoded.uid, [
      'candidate',
      'chairman',
      'chairperson',
      'chairman_demo',
      'chairman-demo',
      'developer',
      'dev',
      'superadmin',
      'administrator',
      'admin',
      'controller',
    ]);

    const candidatesByDistrict: Record<string, number> = {};
    const candidatesByWard: Record<string, number> = {};
    const candidatesByOccupation: Record<string, number> = {};
    let totalCandidates = 0;

    const jobsByDistrict: Record<string, number> = {};
    const jobStatus: Record<string, number> = {};
    const jobDistrict: Record<string, string> = {};
    let openJobs = 0;

    const appsByDistrict: Record<string, number> = {};
    let pendingApps = 0;

    await forEachDoc<any>(
      'users',
      { where: [['role', '==', 'candidate']], select: ['district', 'ward', 'occupation'], pageSize: 2500 },
      (_id, u) => {
        const d = String(u?.district || 'Unknown') || 'Unknown';
        const w = String(u?.ward || 'Unknown') || 'Unknown';
        const o = String(u?.occupation || 'Unknown') || 'Unknown';
        candidatesByDistrict[d] = (candidatesByDistrict[d] || 0) + 1;
        candidatesByWard[w] = (candidatesByWard[w] || 0) + 1;
        candidatesByOccupation[o] = (candidatesByOccupation[o] || 0) + 1;
        totalCandidates += 1;
      },
    );

    await forEachDoc<any>('jobs', { select: ['district', 'status'], pageSize: 2500 }, (id, j) => {
      const d = String(j?.district || 'Unknown') || 'Unknown';
      const s = String(j?.status || 'unknown') || 'unknown';
      jobDistrict[id] = d;
      jobsByDistrict[d] = (jobsByDistrict[d] || 0) + 1;
      jobStatus[s] = (jobStatus[s] || 0) + 1;
      if (s === 'published') openJobs += 1;
    });

    await forEachDoc<any>('applications', { select: ['jobId', 'status'], pageSize: 3500 }, (_id, a) => {
      const s = String(a?.status || 'unknown') || 'unknown';
      const jobId = String(a?.jobId || '');
      const d = jobDistrict[jobId] || 'Unknown';
      appsByDistrict[d] = (appsByDistrict[d] || 0) + 1;
      if (s === 'pending' || s === 'shortlisted') pendingApps += 1;
    });

    const byDistrict = Object.keys({ ...candidatesByDistrict, ...jobsByDistrict, ...appsByDistrict }).map((district) => ({
      district,
      candidates: candidatesByDistrict[district] || 0,
      jobs: jobsByDistrict[district] || 0,
      applications: appsByDistrict[district] || 0,
    }));
    byDistrict.sort((a, b) => b.applications - a.applications);

    const byWard = Object.entries(candidatesByWard)
      .map(([ward, candidates]) => ({ ward, candidates }))
      .sort((a, b) => b.candidates - a.candidates)
      .slice(0, 10);

    const byOccupation = Object.entries(candidatesByOccupation)
      .map(([occupation, candidates]) => ({ occupation, candidates }))
      .sort((a, b) => b.candidates - a.candidates)
      .slice(0, 10);

    const jobStatusList = Object.entries(jobStatus)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return json(res, 200, {
      kpis: {
        candidates: totalCandidates,
        controllers: 0,
        chairmen: 0,
        openJobs,
        pendingApps,
      },
      byDistrict: byDistrict.slice(0, 12),
      byWard,
      byOccupation,
      jobStatus: jobStatusList,
    });
  } catch (e: any) {
    const m = String(e?.message || '');
    if (m === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    if (m === 'profile_missing') return json(res, 404, { error: 'profile_missing' });
    if (m.startsWith('forbidden:')) return json(res, 403, { error: 'forbidden', detail: m.slice('forbidden:'.length) });
    return json(res, 500, { error: 'server_error', detail: m || 'unknown' });
  }
}
