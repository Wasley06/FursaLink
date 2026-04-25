import type { FirebaseOptions } from 'firebase/app';
import { readViteEnv } from './env';

export type FirebaseConfig = FirebaseOptions & { firestoreDatabaseId?: string };

export function getFirebaseConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: readViteEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readViteEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readViteEnv('VITE_FIREBASE_PROJECT_ID'),
    appId: readViteEnv('VITE_FIREBASE_APP_ID'),
    storageBucket: readViteEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readViteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    measurementId: readViteEnv('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
    firestoreDatabaseId: readViteEnv('VITE_FIRESTORE_DATABASE_ID') || undefined,
  };

  // Helpful diagnostics without leaking secrets
  if (!config.apiKey || !config.projectId || !config.appId) {
    console.error(
      [
        'Firebase config missing. Set VITE_FIREBASE_* env vars (see .env.example).',
        `projectId=${config.projectId || '(missing)'}`,
        `appId=${config.appId || '(missing)'}`,
      ].join(' '),
    );
  }

  return config;
}

export function getFirestoreDatabaseId(): string | undefined {
  const dbId = readViteEnv('VITE_FIRESTORE_DATABASE_ID');
  return dbId ? dbId : undefined;
}

