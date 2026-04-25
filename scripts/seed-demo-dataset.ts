import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
  getFirestore,
} from 'firebase/firestore';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function usernameToEmail(raw: string, domain: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
  return `${slug}@${domain}`;
}

function phoneToEmail(phone: string, domain: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@${domain}`;
}

function codeify(part: string, len: number) {
  const cleaned = (part || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, len).padEnd(len, 'X');
}

function buildCandidateIndex(district: string, ward: string, uid: string): string {
  return `ZNZ-${codeify(district, 3)}-${codeify(ward, 3)}-${codeify(uid, 6)}`;
}

const DISTRICTS: Record<string, string[]> = {
  'Mjini': ['Mkele', 'Malindi', 'Shangani', 'Kikwajuni', 'Michenzani', 'Mwanakwerekwe', 'Kwahani', 'Magomeni'],
  'Magharibi A': ['Bububu', 'Kiwengwa', 'Mtoni', 'Mbweni', 'Fuoni', 'Kiembe Samaki', 'Kinuni'],
  'Magharibi B': ['Dimani', 'Kizimkazi', 'Paje', 'Bwejuu', 'Jambiani', 'Makunduchi'],
};

const OCCUPATIONS = [
  'Teacher',
  'Nurse',
  'Doctor',
  'ICT Officer',
  'Accountant',
  'Civil Engineer',
  'Software Engineer',
  'Radiologist',
  'Clerk',
  'Driver',
  'Security Officer',
  'Procurement Officer',
  'Data Analyst',
  'Marketing Specialist',
];

const EDUCATION = ['Certificate', 'Diploma', 'Bachelor', 'Masters'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDob(): string {
  const year = randInt(1975, 2004);
  const month = String(randInt(1, 12)).padStart(2, '0');
  const day = String(randInt(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function ensureDeveloper(auth: any, db: any, domain: string) {
  const devUsername = requiredEnv('FURSALINK_DEV_USERNAME');
  const devPassword = requiredEnv('FURSALINK_DEV_PASSWORD');
  const email = usernameToEmail(devUsername, domain);

  try {
    await createUserWithEmailAndPassword(auth, email, devPassword);
    // created + signed in
  } catch (e: any) {
    if (e?.code === 'auth/email-already-in-use') {
      await signInWithEmailAndPassword(auth, email, devPassword);
    } else {
      throw e;
    }
  }

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Developer sign-in failed');

  await setDoc(
    doc(db, 'users', uid),
    {
      fullName: devUsername,
      phoneNumber: 'DEV',
      role: 'developer',
      phoneVerified: true,
      profileProgress: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function createController(auth: any, db: any, domain: string, input: { district: string; phone: string; fullName: string; password: string }) {
  const email = phoneToEmail(input.phone, domain);
  const password = input.password;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e: any) {
    if (e?.code === 'auth/email-already-in-use') {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      throw e;
    }
  }

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Controller sign-in failed');

  await setDoc(doc(db, 'users', uid), {
    fullName: input.fullName,
    phoneNumber: input.phone,
    role: 'controller',
    district: input.district,
    phoneVerified: true,
    profileProgress: 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await signOut(auth);
}

async function seedCandidates(db: any, total: number) {
  const districts = Object.keys(DISTRICTS);
  const usersCol = collection(db, 'users');
  const batchSize = 450;
  let created = 0;

  while (created < total) {
    const batch = writeBatch(db);
    const take = Math.min(batchSize, total - created);
    for (let i = 0; i < take; i++) {
      const district = pick(districts);
      const ward = pick(DISTRICTS[district]);
      const id = `demo_${district.replace(/\s+/g, '')}_${created + i}_${randInt(1000, 9999)}`;
      batch.set(doc(usersCol, id), {
        fullName: `Demo Candidate ${created + i + 1}`,
        phoneNumber: `077${randInt(1000000, 9999999)}`,
        role: 'candidate',
        district,
        ward,
        dob: randomDob(),
        education: pick(EDUCATION),
        occupation: pick(OCCUPATIONS),
        address: `${ward}, ${district}`,
        candidateIndex: buildCandidateIndex(district, ward, id),
        phoneVerified: true,
        profileProgress: randInt(60, 100),
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    created += take;
    console.log(`Seeded ${created}/${total} demo candidates`);
  }
}

async function main() {
  const domain = process.env.VITE_LOGIN_EMAIL_DOMAIN || 'fursalink.znz';
  const controllerPassword = requiredEnv('FURSALINK_DEMO_CONTROLLER_PASSWORD');

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

  console.log('Ensuring developer account exists...');
  await ensureDeveloper(auth, db, domain);

  console.log('Creating district controller demo accounts...');
  // These phone numbers become the login identifier (phone@domain).
  await createController(auth, db, domain, { district: 'Mjini', fullName: 'Demo Controller - Mjini', phone: '0777000101', password: controllerPassword });
  await createController(auth, db, domain, { district: 'Magharibi A', fullName: 'Demo Controller - Magharibi A', phone: '0777000102', password: controllerPassword });
  await createController(auth, db, domain, { district: 'Magharibi B', fullName: 'Demo Controller - Magharibi B', phone: '0777000103', password: controllerPassword });

  console.log('Signing back in as developer for seeding...');
  await signInWithEmailAndPassword(auth, usernameToEmail(requiredEnv('FURSALINK_DEV_USERNAME'), domain), requiredEnv('FURSALINK_DEV_PASSWORD'));

  const target = Number(process.env.FURSALINK_DEMO_CANDIDATE_COUNT || '1370');
  console.log(`Seeding ${target} demo candidates (Mjini, Magharibi A, Magharibi B)...`);
  await seedCandidates(db, target);

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

