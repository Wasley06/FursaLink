import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import {
  doc,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import { getFirebaseConfig, getFirestoreDatabaseId } from './firebaseConfig';

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, getFirestoreDatabaseId());
export const auth = getAuth(app);
export const storage = getStorage(app);

// Offline-first: enable Firestore local persistence so the app works offline and syncs automatically when online.
// (Multi-tab when available; falls back to single-tab persistence.)
enableMultiTabIndexedDbPersistence(db).catch((e: any) => {
  if (e?.code === 'failed-precondition' || e?.code === 'unimplemented') return;
  enableIndexedDbPersistence(db).catch(() => {});
});

// Connectivity check as per integration guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
  } catch (error: any) {
    if (error.message?.includes('offline')) {
      console.error("Firebase is offline. Please check your network or configuration.");
    }
  }
}

testConnection();

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) {
  const authInfo = {
    userId: auth.currentUser?.uid || 'anonymous',
    email: auth.currentUser?.email || 'none',
    emailVerified: auth.currentUser?.emailVerified || false,
    isAnonymous: auth.currentUser?.isAnonymous || true,
    providerInfo: auth.currentUser?.providerData.map(p => ({
      providerId: p.providerId,
      displayName: p.displayName || '',
      email: p.email || '',
    })) || [],
  };

  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown error',
    operationType,
    path,
    authInfo,
  };

  throw new Error(JSON.stringify(errorInfo));
}
