import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import type { UserProfile, UserRole } from '../types';
import { db } from './firebase';

export function canMessage(input: {
  senderRole: UserRole;
  senderDistrict?: string | null;
  recipientRole: UserRole;
  recipientDistrict?: string | null;
}) {
  const s = input.senderRole;
  const r = input.recipientRole;

  if (s === 'developer') return true;
  if (s === 'administrator') return r === 'chairman';
  if (s === 'controller') {
    if (r === 'chairman') return true;
    if (r === 'candidate') return !!input.senderDistrict && input.senderDistrict === input.recipientDistrict;
    return false;
  }
  if (s === 'chairman') return r === 'administrator' || r === 'controller' || r === 'candidate';
  if (s === 'candidate') {
    // Candidate replies via controller (no direct chairman messaging).
    if (r === 'controller') return !!input.senderDistrict && input.senderDistrict === input.recipientDistrict;
    return false;
  }
  return false;
}

export async function fetchMessagingRecipients(profile: Pick<UserProfile, 'id' | 'role' | 'district'>): Promise<UserProfile[]> {
  const role = profile.role as UserRole;
  const users = collection(db, 'users');

  if (role === 'developer') {
    const snap = await getDocs(query(users, limit(200)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as UserProfile));
  }

  if (role === 'administrator') {
    const snap = await getDocs(query(users, where('role', '==', 'chairman'), limit(10)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as UserProfile));
  }

  if (role === 'controller') {
    const parts: UserProfile[] = [];
    const [chairmen, candidates] = await Promise.all([
      getDocs(query(users, where('role', '==', 'chairman'), limit(10))),
      profile.district
        ? getDocs(query(users, where('role', '==', 'candidate'), where('district', '==', profile.district), limit(300)))
        : Promise.resolve({ docs: [] } as any),
    ]);
    chairmen.docs.forEach((d) => parts.push({ id: d.id, ...(d.data() as any) } as UserProfile));
    candidates.docs.forEach((d: any) => parts.push({ id: d.id, ...(d.data() as any) } as UserProfile));
    return parts;
  }

  if (role === 'chairman') {
    const [admins, controllers, candidates] = await Promise.all([
      getDocs(query(users, where('role', '==', 'administrator'), limit(50))),
      getDocs(query(users, where('role', '==', 'controller'), limit(120))),
      getDocs(query(users, where('role', '==', 'candidate'), limit(250))),
    ]);
    const people: UserProfile[] = [];
    admins.docs.forEach((d) => people.push({ id: d.id, ...(d.data() as any) } as UserProfile));
    controllers.docs.forEach((d) => people.push({ id: d.id, ...(d.data() as any) } as UserProfile));
    candidates.docs.forEach((d) => people.push({ id: d.id, ...(d.data() as any) } as UserProfile));
    return people;
  }

  // candidate
  const parts: UserProfile[] = [];
  const [controllers] = await Promise.all([
    profile.district
      ? getDocs(query(users, where('role', '==', 'controller'), where('district', '==', profile.district), limit(50)))
      : Promise.resolve({ docs: [] } as any),
  ]);
  controllers.docs.forEach((d: any) => parts.push({ id: d.id, ...(d.data() as any) } as UserProfile));
  return parts;
}
