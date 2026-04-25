import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Course, Event, Job } from '../types';

export async function listPublishedJobs(opts?: { occupation?: string; district?: string; take?: number }) {
  const base = collection(db, 'jobs');
  const parts: any[] = [where('status', '==', 'published'), orderBy('createdAt', 'desc')];
  if (opts?.occupation) parts.push(where('occupation', '==', opts.occupation));
  if (opts?.district) parts.push(where('district', '==', opts.district));
  parts.push(limit(opts?.take ?? 25));
  const snap = await getDocs(query(base, ...parts));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));
}

export async function getJob(jobId: string) {
  const snap = await getDoc(doc(db, 'jobs', jobId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Job;
}

export async function listPublishedCourses(take: number = 20) {
  const snap = await getDocs(
    query(collection(db, 'courses'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(take)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

export async function listPublishedEvents(take: number = 20) {
  const snap = await getDocs(
    query(collection(db, 'events'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(take)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

export async function createCourse(input: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'courses'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCourse(courseId: string, patch: Partial<Course>) {
  await updateDoc(doc(db, 'courses', courseId), { ...patch, updatedAt: serverTimestamp() } as any);
}

export async function deleteCourse(courseId: string) {
  await deleteDoc(doc(db, 'courses', courseId));
}

export async function createEvent(input: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'events'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(eventId: string, patch: Partial<Event>) {
  await updateDoc(doc(db, 'events', eventId), { ...patch, updatedAt: serverTimestamp() } as any);
}

export async function deleteEvent(eventId: string) {
  await deleteDoc(doc(db, 'events', eventId));
}

