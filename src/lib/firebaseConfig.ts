import type { FirebaseOptions } from 'firebase/app';
import { readViteEnv } from './env';
import jsonFallback from '../../firebase-applet-config.json';

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
    // Fallback to packaged config to avoid a blank screen in misconfigured deployments.
    // NOTE: You should still configure Vercel env vars for a clean production setup.
    const fb: any = jsonFallback as any;
    const fallback: FirebaseConfig = {
      apiKey: fb.apiKey,
      authDomain: fb.authDomain,
      projectId: fb.projectId,
      appId: fb.appId,
      storageBucket: fb.storageBucket,
      messagingSenderId: fb.messagingSenderId,
      measurementId: fb.measurementId || undefined,
      firestoreDatabaseId: fb.firestoreDatabaseId || undefined,
    };
    console.warn(
      [
        'Firebase env config missing; using firebase-applet-config.json fallback.',
        'Set VITE_FIREBASE_* env vars in Vercel to remove this fallback.',
      ].join(' '),
    );
    return fallback;
  }

  return config;
}

export function getFirestoreDatabaseId(): string | undefined {
  const dbId = readViteEnv('VITE_FIRESTORE_DATABASE_ID');
  return dbId ? dbId : undefined;
}
