import 'dotenv/config';
import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc, terminate } from 'firebase/firestore';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function usernameToEmail(username: string, domain: string): string {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
  return `${slug}@${domain}`;
}

async function main() {
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

  const app = initializeApp(firebaseConfig as any);
  const auth = getAuth(app);
  const db = getFirestore(app, process.env.VITE_FIRESTORE_DATABASE_ID || undefined);

  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, devPassword);
    uid = cred.user.uid;
    console.log(`Created Firebase user: ${email}`);
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, devPassword);
      uid = cred.user.uid;
      console.log(`Signed in existing Firebase user: ${email}`);
    } else {
      throw err;
    }
  }

  await setDoc(
    doc(db, 'users', uid),
    {
      fullName: devUsername,
      // Must satisfy Firestore rules (min length); developer logs in via username->email.
      phoneNumber: '0700000000',
      role: 'developer',
      profileProgress: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      seededBy: 'scripts/create-dev-user.ts',
    },
    { merge: true },
  );

  console.log(`Upserted profile role=developer for uid=${uid}`);

  // Ensure the Node process exits (Firestore keeps background connections open).
  try {
    await terminate(db as any);
  } catch {}
  try {
    await deleteApp(app);
  } catch {}
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
