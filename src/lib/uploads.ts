import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from './firebase';
import { getSupabaseClient, getSupabaseClientConfig } from './supabaseClient';
import { getLiveAppUrl } from './liveAppUrl';

export type StorageProvider = 'firebase' | 'supabase';

export type StoredFileRef = {
  provider: StorageProvider;
  bucket?: string;
  path: string;
};

export type UploadResult = {
  ref: StoredFileRef;
  url?: string;
};

function readStorageProvider(): StorageProvider {
  const p = (import.meta.env.VITE_STORAGE_PROVIDER as string | undefined)?.toLowerCase();
  if (p === 'supabase') return 'supabase';
  if (p === 'firebase') return 'firebase';
  return getSupabaseClientConfig() ? 'supabase' : 'firebase';
}

export async function uploadUserFile(
  input: {
    uid: string;
    file: File;
    kind: 'profile' | 'cv' | 'document' | 'id' | 'certificates' | 'tin' | 'sheha' | 'course_image' | 'ad_image';
    nameHint?: string;
    onProgress?: (pct: number) => void;
  },
): Promise<UploadResult> {
  if (readStorageProvider() === 'supabase') {
    const supabase = getSupabaseClient();
    const cfg = getSupabaseClientConfig();
    if (!supabase || !cfg) throw new Error('Supabase storage is not configured.');
    if (!auth.currentUser) throw new Error('You must be signed in to upload files.');

    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${getLiveAppUrl()}/api/storage/sign`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mode: 'upload',
        kind: input.kind,
        filename: input.file.name || input.nameHint || input.kind,
        contentType: input.file.type || undefined,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.detail || body?.error || 'Failed to prepare upload.');

    const bucket = String(body.bucket || '');
    const path = String(body.path || '');
    const uploadToken = String(body.token || '');
    if (!bucket || !path || !uploadToken) throw new Error('Upload signing response missing fields.');

    // Supabase signed upload API (client-side) does not provide progress events.
    input.onProgress?.(1);
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, uploadToken, input.file, {
      contentType: input.file.type || 'application/octet-stream',
      upsert: true,
    });
    if (error) throw new Error(error.message || 'Upload failed.');
    input.onProgress?.(100);

    const ref: StoredFileRef = { provider: 'supabase', bucket, path };
    if (input.kind === 'profile') {
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      return { ref, url: publicUrl };
    }

    return { ref };
  }

  const ext = (() => {
    const n = input.file.name || '';
    const idx = n.lastIndexOf('.');
    if (idx >= 0) return n.slice(idx + 1).toLowerCase().slice(0, 10);
    return '';
  })();

  const safeHint = (input.nameHint || input.file.name || input.kind)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .slice(0, 60);

  const stamp = Date.now();
  const path = `users/${input.uid}/${input.kind}/${stamp}-${safeHint}${ext ? `.${ext}` : ''}`;
  const storageRef = ref(storage, path);

  const task = uploadBytesResumable(storageRef, input.file, {
    contentType: input.file.type || undefined,
    cacheControl: 'public, max-age=31536000, immutable',
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (!input.onProgress) return;
        const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
        input.onProgress(pct);
      },
      (err) => reject(err),
      () => resolve(),
    );
  });

  const url = await getDownloadURL(task.snapshot.ref);
  return { ref: { provider: 'firebase', path }, url };
}

export async function getSignedDownloadUrl(fileRef: StoredFileRef, opts?: { expiresIn?: number }): Promise<string> {
  if (fileRef.provider === 'firebase') {
    return getDownloadURL(ref(storage, fileRef.path));
  }

  if (!auth.currentUser) throw new Error('You must be signed in to download files.');
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${getLiveAppUrl()}/api/storage/sign`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      mode: 'download',
      bucket: fileRef.bucket,
      path: fileRef.path,
      expiresIn: opts?.expiresIn ?? 3600,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.detail || body?.error || 'Failed to create download link.');
  return String(body.signedUrl || '');
}
