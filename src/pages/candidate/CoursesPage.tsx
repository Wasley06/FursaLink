import React, { useEffect, useState } from 'react';
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';
import { BookOpen, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { listPublishedCourses } from '../../services/dataService';
import type { Course, CourseEnrollment } from '../../types';

export default function CoursesPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      try {
        const [cs, enSnap] = await Promise.all([
          listPublishedCourses(50),
          getDocs(query(collection(db, 'courseEnrollments'), where('userId', '==', profile.id), limit(200))),
        ]);
        setCourses(cs);
        const map: Record<string, boolean> = {};
        enSnap.docs.forEach((d) => (map[(d.data() as any).courseId] = true));
        setEnrollments(map);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profile]);

  const enroll = async (courseId: string) => {
    if (!profile) return;
    await addDoc(collection(db, 'courseEnrollments'), {
      userId: profile.id,
      courseId,
      status: 'enrolled',
      createdAt: serverTimestamp(),
    } as Omit<CourseEnrollment, 'id'>);
    setEnrollments((p) => ({ ...p, [courseId]: true }));
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Courses</h1>
            <p className="text-sm text-muted font-medium">Enroll in government training programs.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="text-sm text-muted italic">No published courses yet.</div>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-navy truncate">{c.title}</div>
                  <div className="text-xs text-muted font-medium truncate">{c.category}</div>
                </div>
                {enrollments[c.id] ? (
                  <span className="inline-flex items-center gap-1 text-emerald text-xs font-black uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Enrolled
                  </span>
                ) : (
                  <button onClick={() => enroll(c.id)} className="btn-primary py-2 px-4 text-xs font-black uppercase tracking-widest">
                    Enroll
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

