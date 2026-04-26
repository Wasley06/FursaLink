import 'dotenv/config';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc, terminate } from 'firebase/firestore';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function usernameToEmail(username, domain) {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
  return `${slug}@${domain}`;
}

async function main() {
  console.log('[seed:dev-user] starting...');

  const devUsername = requiredEnv('FURSALINK_DEV_USERNAME');
  const devPassword = requiredEnv('FURSALINK_DEV_PASSWORD');

  const emailDomain = process.env.VITE_LOGIN_EMAIL_DOMAIN || 'fursalink.znz';
  const email = usernameToEmail(devUsername, emailDomain);

  const firebaseConfig = {
    apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
    authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
    appId: requiredEnv('VITE_FIREBASE_APP_ID'),
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app, process.env.VITE_FIRESTORE_DATABASE_ID || undefined);

  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, devPassword);
    uid = cred.user.uid;
    console.log(`[seed:dev-user] created auth user: ${email}`);
  } catch (err) {
    if (err?.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, devPassword);
      uid = cred.user.uid;
      console.log(`[seed:dev-user] signed in existing auth user: ${email}`);
    } else {
      throw err;
    }
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      fullName: devUsername,
      phoneNumber: '0700000000',
      role: 'developer',
      phoneVerified: true,
      profileProgress: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      seededBy: 'scripts/create-dev-user.mjs',
    },
    { merge: true },
  );

  console.log(`[seed:dev-user] upserted Firestore profile role=developer for uid=${uid}`);

  try {
    await auth.signOut();
  } catch {}
  try {
    await terminate(db);
  } catch {}
  try {
    await deleteApp(app);
  } catch {}

  console.log('[seed:dev-user] done.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed:dev-user] failed:', e);
  process.exitCode = 1;
});
