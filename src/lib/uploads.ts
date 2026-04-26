import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from './firebase';

export type UploadResult = {
  path: string;
  url: string;
};

export async function uploadUserFile(
  input: {
    uid: string;
    file: File;
    kind: 'profile' | 'cv' | 'document';
    nameHint?: string;
    onProgress?: (pct: number) => void;
  },
): Promise<UploadResult> {
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
  return { path, url };
}

