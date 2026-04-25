import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function logAudit(action: string, meta?: Record<string, any>) {
  try {
    const actorId = auth.currentUser?.uid || 'anonymous';
    await addDoc(collection(db, 'auditLogs'), {
      actorId,
      action,
      meta: meta || {},
      createdAt: serverTimestamp(),
    });
  } catch {
    // Never block UX on audit logging failures.
  }
}

