import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

let intervalId: number | null = null;

export function startPresence(uid: string, meta?: Record<string, any>) {
  stopPresence();
  const ref = doc(db, 'presence', uid);
  const write = async () => {
    try {
      await setDoc(
        ref,
        {
          uid,
          lastSeen: serverTimestamp(),
          userAgent: navigator.userAgent,
          appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown',
          ...meta,
        },
        { merge: true },
      );
    } catch {
      // ignore
    }
  };
  write();
  intervalId = window.setInterval(write, 30_000);
}

export function stopPresence() {
  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

