import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { Job } from '../../types';
import { logAudit } from '../../lib/audit';

export default function JobsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      try {
        const snap = await getDocs(
          query(collection(db, 'jobs'), where('controllerId', '==', profile.id), orderBy('createdAt', 'desc'), limit(100)),
        );
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profile]);

  const remove = async (job: Job) => {
    if (!confirm(`Delete job "${job.title}"?`)) return;
    await deleteDoc(doc(db, 'jobs', job.id));
    await logAudit('job:delete', { jobId: job.id });
    setJobs((p) => p.filter((j) => j.id !== job.id));
  };

  const toggle = async (job: Job) => {
    const next = job.status === 'published' ? 'unpublished' : 'published';
    await updateDoc(doc(db, 'jobs', job.id), { status: next, updatedAt: serverTimestamp() } as any);
    await logAudit('job:status', { jobId: job.id, status: next });
    setJobs((p) => p.map((j) => (j.id === job.id ? ({ ...j, status: next } as any) : j)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Job Management</h1>
          <p className="text-sm text-muted font-medium">Manage district vacancies and publish updates.</p>
        </div>
        <Link to="/controller/jobs/new" className="btn-primary">
          <Plus className="w-5 h-5 mr-1" /> Create Job
        </Link>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="text-sm text-muted italic">No jobs posted yet.</div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-navy truncate">{j.title}</div>
                    <div className="text-xs text-muted font-medium truncate">
                      {j.occupation} • {j.district}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(j)} className="btn-outline py-2 px-3 text-xs">
                      {j.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => navigate(`/controller/jobs/${j.id}/edit`)} className="p-2 hover:bg-white rounded-xl">
                      <Edit2 className="w-4 h-4 text-muted" />
                    </button>
                    <button onClick={() => remove(j)} className="p-2 hover:bg-danger/10 rounded-xl">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <span className={j.status === 'published' ? 'status-pill status-approved' : 'status-pill status-pending'}>
                    {j.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
