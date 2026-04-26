import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireFirebaseUser } from '../_lib/firebaseAdmin';
import { getSupabaseBuckets, getSupabaseServer } from '../_lib/supabaseServer';

type UploadKind = 'profile' | 'cv' | 'document';

function json(res: VercelResponse, status: number, body: any) {
  res.status(status).setHeader('content-type', 'application/json').send(JSON.stringify(body));
}

function pickKind(input: any): UploadKind | null {
  if (input === 'profile' || input === 'cv' || input === 'document') return input;
  return null;
}

function safeName(name: string) {
  return (name || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .slice(0, 80);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const decoded = await requireFirebaseUser(req);
    const kind = pickKind((req.body as any)?.kind);
    if (!kind) return json(res, 400, { error: 'invalid_kind' });

    const filename = safeName(String((req.body as any)?.filename || 'file'));

    const { publicBucket, privateBucket } = getSupabaseBuckets();
    const bucket = kind === 'profile' ? publicBucket : privateBucket;
    const uid = decoded.uid;

    const stamp = Date.now();
    const path = `users/${uid}/${kind}/${stamp}-${filename}`;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) return json(res, 500, { error: 'supabase_error', detail: error?.message || 'unknown' });

    return json(res, 200, {
      provider: 'supabase',
      bucket,
      path: data.path || path,
      token: data.token,
      signedUrl: data.signedUrl,
      visibility: kind === 'profile' ? 'public' : 'private',
    });
  } catch (e: any) {
    if (String(e?.message || '') === 'missing_auth') return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: 'server_error', detail: e?.message || 'unknown' });
  }
}
