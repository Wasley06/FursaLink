import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { FileCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { Application, ApprovalRequest, Job, UserProfile } from '../../types';
import { logAudit } from '../../lib/audit';

type Row = { app: Application; job: Job | null; user: UserProfile | null };

export default function ApplicationsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      try {
        const snap = await getDocs(
          query(collection(db, 'applications'), where('status', '==', 'pending'), orderBy('appliedAt', 'desc'), limit(50)),
        );
        const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Application));
        const jobIds = Array.from(new Set(apps.map((a) => a.jobId)));
        const userIds = Array.from(new Set(apps.map((a) => a.userId)));

        const jobDocs = await Promise.all(jobIds.map((id) => getDoc(doc(db, 'jobs', id))));
        const userDocs = await Promise.all(userIds.map((id) => getDoc(doc(db, 'users', id))));

        const jobsById: Record<string, Job> = {};
        jobDocs.forEach((s) => s.exists() && (jobsById[s.id] = { id: s.id, ...s.data() } as Job));
        const usersById: Record<string, UserProfile> = {};
        userDocs.forEach((s) => s.exists() && (usersById[s.id] = { id: s.id, ...s.data() } as UserProfile));

        const filtered = apps
          .map((app) => ({ app, job: jobsById[app.jobId] || null, user: usersById[app.userId] || null }))
          .filter((r) => !r.job?.district || r.job?.district === profile.district);

        setRows(filtered);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profile]);

  const setStatus = async (row: Row, status: Application['status']) => {
    await updateDoc(doc(db, 'applications', row.app.id), { status, updatedAt: serverTimestamp() } as any);
    await logAudit('application:status', { applicationId: row.app.id, status });
    if (status === 'shortlisted' && profile) {
      await addDoc(collection(db, 'approvalRequests'), {
        applicationId: row.app.id,
        userId: row.app.userId,
        occupation: row.job?.occupation || undefined,
        district: row.job?.district || profile.district || undefined,
        controllerId: profile.id,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Omit<ApprovalRequest, 'id'>);
      await logAudit('approvalRequest:create', { applicationId: row.app.id });
    }
    setRows((p) => p.map((r) => (r.app.id === row.app.id ? { ...r, app: { ...r.app, status } } : r)));
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Verification Queue</h1>
            <p className="text-sm text-muted font-medium">Pending candidate applications.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading applications…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted italic">No pending applications.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Job</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {rows.map((r) => (
                  <tr key={r.app.id} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-navy">{r.user?.fullName || r.app.userId}</td>
                    <td className="px-6 py-4 text-sm text-muted">{r.job?.title || r.app.jobId}</td>
                    <td className="px-6 py-4 text-sm text-muted">{r.job?.district || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setStatus(r, 'shortlisted')} className="btn-outline py-2 px-3 text-xs">
                          Shortlist
                        </button>
                        <button onClick={() => setStatus(r, 'rejected')} className="btn-outline py-2 px-3 text-xs">
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
