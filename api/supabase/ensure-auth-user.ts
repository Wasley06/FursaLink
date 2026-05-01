import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminDb, requireFirebaseUser } from '../_lib/firebaseAdmin.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeEmail(raw: unknown) {
  const s = String(raw || '').trim().toLowerCase();
  return s.includes('@') ? s : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const user = await requireFirebaseUser(req as any);
    const uid = String(user?.uid || '').trim();
    if (!uid) return json(res, 401, { error: 'unauthorized' });

    const db = getFirebaseAdminDb();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return json(res, 404, { error: 'profile_not_found' });

    const profile = snap.data() as any;
    const role = String(profile?.role || '');
    if (role !== 'candidate') return json(res, 403, { error: 'forbidden' });

    const email = normalizeEmail(profile?.contactEmail);
    if (!email) return json(res, 400, { error: 'missing_contact_email' });

    const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/+$/, '');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        email_confirm: true,
        user_metadata: { source: 'fursalink:firebase', firebase_uid: uid },
      }),
    });

    if (createRes.ok) return json(res, 200, { ok: true, created: true });

    const txt = await createRes.text().catch(() => '');
    // Supabase/GoTrue commonly returns 422 when user exists. Treat as OK.
    if (createRes.status === 422) return json(res, 200, { ok: true, created: false });

    return json(res, 500, { error: 'supabase_admin_failed', detail: txt.slice(0, 200) });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: msg.slice(0, 240) });
  }
}
