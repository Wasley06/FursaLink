import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import type { UserProfile, UserRole } from '../types';
import { db } from './firebase';

export function canMessage(input: {
  senderRole: UserRole;
  senderDistrict?: string | null;
  recipientRole: UserRole;
  recipientDistrict?: string | null;
}) {
  // Messaging is open: any signed-in user can start a thread with any other user.
  // Firestore security rules still enforce that senderId matches request.auth.uid.
  void input;
  return true;
}

export async function fetchMessagingRecipients(profile: Pick<UserProfile, 'id' | 'role' | 'district'>): Promise<UserProfile[]> {
  const users = collection(db, 'users');

  // For performance we cap recipients; the UI still supports starting a new thread with anyone in this list.
  const snap = await getDocs(query(users, limit(400)));
  const people = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) } as UserProfile))
    .filter((u) => u.id && u.id !== profile.id);

  // Prefer showing same-district people first (nice UX), but do not restrict.
  const district = (profile.district || '').toString();
  people.sort((a, b) => {
    const ad = (a.district || '').toString();
    const bd = (b.district || '').toString();
    const aSame = district && ad === district ? 0 : 1;
    const bSame = district && bd === district ? 0 : 1;
    if (aSame !== bSame) return aSame - bSame;
    return String(a.fullName || '').localeCompare(String(b.fullName || ''));
  });

  return people;
}
