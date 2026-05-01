import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { StoredFileRef, UserProfile } from '../types';
import { auth, db } from './firebase';
import { sendNotification } from './notify';
import { getLiveAppUrl } from './liveAppUrl';
import { enqueueOfflineAction } from './offlineActions';

export type AdministratorApprovalStatus = 'pending' | 'approved' | 'rejected';

export type AdministratorApproval = {
  id: string; // equals candidate userId for stable identity
  userId: string;
  candidateName?: string;
  phoneNumber?: string;
  candidateIndex?: string;
  district?: string;
  ward?: string;
  occupation?: string;
  dob?: string;

  status: AdministratorApprovalStatus;
  chairmanRemarks?: string;
  adminNotes?: string;

  photoUrl?: string;
  cvUrl?: string;
  documentsUrl?: string;
  photoRef?: StoredFileRef | null;
  cvRef?: StoredFileRef | null;
  documentsRef?: StoredFileRef | null;

  pushedBy: string;
  pushedAt: any;
  decidedBy?: string;
  decidedAt?: any;
  createdAt: any;
  updatedAt: any;
};

export async function pushToAdministratorQueue(input: {
  candidate: Pick<
    UserProfile,
    | 'id'
    | 'fullName'
    | 'phoneNumber'
    | 'district'
    | 'ward'
    | 'candidateIndex'
    | 'dob'
    | 'occupation'
    | 'photoUrl'
    | 'cvUrl'
    | 'documentsUrl'
    | 'photoRef'
    | 'cvRef'
    | 'documentsRef'
  >;
  chairmanId: string;
  chairmanRemarks?: string;
  administratorIds?: string[];
}) {
  const actorId = auth.currentUser?.uid || input.chairmanId;
  // Prefer server-side push (Firebase Admin) to avoid Firestore rules edge-cases.
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${getLiveAppUrl()}/api/administrator/push`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ candidateId: input.candidate.id, chairmanRemarks: input.chairmanRemarks || '' }),
      });
      if (res.ok) {
        for (const adminId of input.administratorIds || []) {
          await sendNotification({
            recipientId: adminId,
            title: 'New profile in approval queue',
            message: `${input.candidate.fullName} (${input.candidate.candidateIndex || input.candidate.phoneNumber})`,
            targetPath: '/administrator/approvals',
          });
        }
        return;
      }
    }
  } catch {
    enqueueOfflineAction({ type: 'admin_push_one', candidateId: input.candidate.id, chairmanRemarks: input.chairmanRemarks || '' });
    // fall back to direct Firestore write below
  }
  const approvalId = input.candidate.id;
  const ref = doc(db, 'administratorApprovals', approvalId);

  const payload: Omit<AdministratorApproval, 'id'> = {
    userId: input.candidate.id,
    candidateName: input.candidate.fullName || '',
    phoneNumber: input.candidate.phoneNumber || '',
    candidateIndex: input.candidate.candidateIndex || '',
    district: input.candidate.district || '',
    ward: input.candidate.ward || '',
    occupation: input.candidate.occupation || '',
    dob: input.candidate.dob || '',
    status: 'pending',
    chairmanRemarks: input.chairmanRemarks || '',
    adminNotes: '',
    photoUrl: input.candidate.photoUrl || '',
    cvUrl: input.candidate.cvUrl || '',
    documentsUrl: input.candidate.documentsUrl || '',
    photoRef: input.candidate.photoRef || null,
    cvRef: input.candidate.cvRef || null,
    documentsRef: input.candidate.documentsRef || null,
    pushedBy: actorId,
    pushedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload as any, { merge: true });
  await setDoc(doc(collection(db, 'administratorApprovalEvents')), {
    approvalId,
    actorId,
    action: 'push',
    message: input.chairmanRemarks || '',
    createdAt: serverTimestamp(),
  });

  for (const adminId of input.administratorIds || []) {
    await sendNotification({
      recipientId: adminId,
      title: 'New profile in approval queue',
      message: `${input.candidate.fullName} (${input.candidate.candidateIndex || input.candidate.phoneNumber})`,
      targetPath: '/administrator/approvals',
    });
  }
}

export async function pushManyToAdministratorQueue(input: {
  candidates: Array<Pick<
    UserProfile,
    | 'id'
    | 'fullName'
    | 'phoneNumber'
    | 'district'
    | 'ward'
    | 'candidateIndex'
    | 'dob'
    | 'occupation'
    | 'photoUrl'
    | 'cvUrl'
    | 'documentsUrl'
    | 'photoRef'
    | 'cvRef'
    | 'documentsRef'
  >>;
  chairmanId: string;
  chairmanRemarks?: string;
  administratorIds?: string[];
}) {
  const actorId = auth.currentUser?.uid || input.chairmanId;
  const candidates = input.candidates.filter((c) => !!c?.id);
  if (candidates.length === 0) return;

  // Prefer server-side bulk push (Firebase Admin) to avoid Firestore rules edge-cases.
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${getLiveAppUrl()}/api/administrator/push-many`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ candidateIds: candidates.map((c) => c.id), chairmanRemarks: input.chairmanRemarks || '' }),
      });
      if (res.ok) {
        for (const adminId of input.administratorIds || []) {
          await sendNotification({
            recipientId: adminId,
            title: 'New profiles pushed',
            message: `${candidates.length} candidate profiles added to the approval queue.`,
            targetPath: '/administrator/approvals',
          });
        }
        return;
      }
    }
  } catch {
    enqueueOfflineAction({ type: 'admin_push_many', candidateIds: candidates.map((c) => c.id), chairmanRemarks: input.chairmanRemarks || '' });
    // fall back to direct Firestore writes below
  }

  // Each candidate: approvals doc + event doc => 2 writes. Keep under 450 writes per commit for safety.
  const chunkSize = 200;
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const slice = candidates.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const c of slice) {
      const approvalId = c.id;
      const ref = doc(db, 'administratorApprovals', approvalId);
      batch.set(
        ref,
        {
          userId: c.id,
          candidateName: c.fullName || '',
          phoneNumber: c.phoneNumber || '',
          candidateIndex: c.candidateIndex || '',
          district: c.district || '',
          ward: c.ward || '',
          occupation: c.occupation || '',
          dob: c.dob || '',
          status: 'pending',
          chairmanRemarks: input.chairmanRemarks || '',
          adminNotes: '',
          photoUrl: c.photoUrl || '',
          cvUrl: c.cvUrl || '',
          documentsUrl: c.documentsUrl || '',
          photoRef: c.photoRef || null,
          cvRef: c.cvRef || null,
          documentsRef: c.documentsRef || null,
          pushedBy: actorId,
          pushedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as any,
        { merge: true } as any,
      );

      batch.set(doc(collection(db, 'administratorApprovalEvents')), {
        approvalId,
        actorId,
        action: 'push',
        message: input.chairmanRemarks || '',
        createdAt: serverTimestamp(),
      } as any);
    }
    await batch.commit();
  }

  // Notify administrators once per bulk push.
  for (const adminId of input.administratorIds || []) {
    await sendNotification({
      recipientId: adminId,
      title: 'New profiles pushed',
      message: `${candidates.length} candidate profiles added to the approval queue.`,
      targetPath: '/administrator/approvals',
    });
  }
}

export async function decideAdministratorApproval(input: {
  approvalId: string;
  adminId: string;
  status: AdministratorApprovalStatus;
  adminNotes?: string;
  notifyChairmanId?: string | null;
}) {
  const ref = doc(db, 'administratorApprovals', input.approvalId);
  await updateDoc(ref, {
    status: input.status,
    adminNotes: input.adminNotes || '',
    decidedBy: input.adminId,
    decidedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);

  await addDoc(collection(db, 'administratorApprovalEvents'), {
    approvalId: input.approvalId,
    actorId: input.adminId,
    action: input.status,
    message: input.adminNotes || '',
    createdAt: serverTimestamp(),
  });

  if (input.notifyChairmanId) {
    await sendNotification({
      recipientId: input.notifyChairmanId,
      title: `Administrator decision: ${input.status.toUpperCase()}`,
      message: `Candidate profile updated (${input.approvalId}).`,
      targetPath: '/chairman/approvals',
    });
  }
}
