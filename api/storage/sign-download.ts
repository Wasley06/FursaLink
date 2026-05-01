import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireFirebaseUser } from '../_lib/firebaseAdmin.js';
import { getSupabaseServer } from '../_lib/supabaseServer.js';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json').send(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const decoded = await requireFirebaseUser(req);
    const bucket = String((req.body as any)?.bucket || '');
    const path = String((req.body as any)?.path || '');
    const expiresIn = Number((req.body as any)?.expiresIn || 3600);

    if (!bucket || !path) return json(res, 400, { error: 'missing_params' });

    // Basic safety: only allow downloads inside users/<uid>/... OR public assets.
    const uid = decoded.uid;
    const isOwn = path.startsWith(`users/${uid}/`);
    const isProfile = path.includes('/profile/');
    if (!isOwn && !isProfile) return json(res, 403, { error: 'forbidden' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, Math.max(60, Math.min(86400, expiresIn)));
    if (error || !data?.signedUrl) return json(res, 500, { error: 'supabase_error', detail: error?.message || 'unknown' });

    return json(res, 200, { signedUrl: data.signedUrl });
  } catch (e: any) {
    if (String(e?.message || '') === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: e?.message || 'unknown' });
  }
}
