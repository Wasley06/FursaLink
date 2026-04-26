import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getFirebaseAdminAuth() {
  if (!getApps().length) {
    const projectId = requireEnv('FIREBASE_ADMIN_PROJECT_ID');
    const clientEmail = requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
    const privateKey = requireEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  return getAuth();
}

export async function requireFirebaseUser(req: { headers?: Record<string, any> }) {
  const raw = (req.headers?.authorization || req.headers?.Authorization || '') as string;
  const header = Array.isArray(raw) ? raw[0] : String(raw || '');
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('missing_auth');
  const auth = getFirebaseAdminAuth();
  return auth.verifyIdToken(token);
}
