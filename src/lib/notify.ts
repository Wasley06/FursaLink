import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function sendNotification(input: { recipientId: string; title: string; message?: string; targetPath?: string }) {
  if (!auth.currentUser?.uid) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      senderId: auth.currentUser.uid,
      recipientId: input.recipientId,
      title: input.title,
      message: input.message || '',
      targetPath: input.targetPath || '',
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Notifications must never block UX.
  }
}

