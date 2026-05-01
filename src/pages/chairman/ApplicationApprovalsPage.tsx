import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle2, FileCheck, XCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { ApprovalRequest, Application, Job, UserProfile } from '../../types';
import { logAudit } from '../../lib/audit';

type Row = { req: ApprovalRequest; app: Application | null; user: UserProfile | null; job: Job | null };

export default function ApplicationApprovalsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'approvalRequests'), orderBy('createdAt', 'desc'), limit(100)));
        const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ApprovalRequest));

        const appIds = Array.from(new Set(reqs.map((r) => r.applicationId).filter(Boolean) as string[]));
        const userIds = Array.from(new Set(reqs.map((r) => r.userId).filter(Boolean) as string[]));

        const appDocs = await Promise.all(appIds.map((id) => getDoc(doc(db, 'applications', id))));
        const appsById: Record<string, Application> = {};
        appDocs.forEach((s) => s.exists() && (appsById[s.id] = { id: s.id, ...s.data() } as Application));

        const jobIds = Array.from(new Set(Object.values(appsById).map((a) => a.jobId)));
        const jobDocs = await Promise.all(jobIds.map((id) => getDoc(doc(db, 'jobs', id))));
        const jobsById: Record<string, Job> = {};
        jobDocs.forEach((s) => s.exists() && (jobsById[s.id] = { id: s.id, ...s.data() } as Job));

        const userDocs = await Promise.all(userIds.map((id) => getDoc(doc(db, 'users', id))));
        const usersById: Record<string, UserProfile> = {};
        userDocs.forEach((s) => s.exists() && (usersById[s.id] = { id: s.id, ...s.data() } as UserProfile));

        setRows(
          reqs.map((req) => {
            const app = req.applicationId ? appsById[req.applicationId] || null : null;
            const job = app ? jobsById[app.jobId] || null : null;
            const user = usersById[req.userId] || null;
            return { req, app, user, job };
          }),
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const decide = async (row: Row, status: ApprovalRequest['status']) => {
    if (!profile) return;
    await updateDoc(doc(db, 'approvalRequests', row.req.id), {
      status,
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any);

    if (row.req.applicationId) {
      const appStatus: Application['status'] = status === 'approved' ? 'approved' : 'rejected';
      await updateDoc(doc(db, 'applications', row.req.applicationId), { status: appStatus, updatedAt: serverTimestamp() } as any);
    }

    await addDoc(collection(db, 'approvalLogs'), {
      approvalRequestId: row.req.id,
      actorId: profile.id,
      action: status,
      createdAt: serverTimestamp(),
    });
    await logAudit('approvalRequest:decide', { approvalRequestId: row.req.id, status });

    setRows((p) => p.map((r) => (r.req.id === row.req.id ? { ...r, req: { ...r.req, status } } : r)));
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Application Approvals</h1>
            <p className="text-sm text-muted font-medium">Approve or reject shortlisted applications (logged).</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading approval requests…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted italic">No approval requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Job</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {rows.map((r) => (
                  <tr key={r.req.id} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-navy">{r.user?.fullName || r.req.userId}</td>
                    <td className="px-6 py-4 text-sm text-muted">{r.job?.title || r.req.occupation || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted">{r.job?.district || r.req.district || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          r.req.status === 'approved'
                            ? 'status-pill status-approved'
                            : r.req.status === 'rejected'
                              ? 'status-pill status-rejected'
                              : 'status-pill status-pending'
                        }
                      >
                        {r.req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.req.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => decide(r, 'approved')} className="btn-primary py-2 px-3 text-xs">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                          </button>
                          <button onClick={() => decide(r, 'rejected')} className="btn-outline py-2 px-3 text-xs">
                            <XCircle className="w-4 h-4 mr-2 text-danger" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted font-bold uppercase tracking-widest">Decided</span>
                      )}
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

