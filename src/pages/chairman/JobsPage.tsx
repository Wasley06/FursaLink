import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import type { Job } from '../../types';
import { logAudit } from '../../lib/audit';

export default function ChairmanJobsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(400)));
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((j) => {
      return (
        (j.title || '').toLowerCase().includes(needle) ||
        (j.district || '').toLowerCase().includes(needle) ||
        (j.occupation || '').toLowerCase().includes(needle) ||
        (j.status || '').toLowerCase().includes(needle)
      );
    });
  }, [items, q]);

  const remove = async (job: Job) => {
    if (!confirm(`Delete job "${job.title}"?`)) return;
    await deleteDoc(doc(db, 'jobs', job.id));
    await logAudit('chairman:job:delete', { jobId: job.id });
    setItems((p) => p.filter((x) => x.id !== job.id));
  };

  const toggle = async (job: Job) => {
    const next = job.status === 'published' ? 'unpublished' : 'published';
    await updateDoc(doc(db, 'jobs', job.id), { status: next, updatedAt: serverTimestamp() } as any);
    await logAudit('chairman:job:status', { jobId: job.id, status: next });
    setItems((p) => p.map((x) => (x.id === job.id ? ({ ...x, status: next } as any) : x)));
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Open Jobs</h1>
            <p className="text-sm text-muted font-medium">Review, edit, or remove jobs across all districts.</p>
          </div>
          <input className="input-field w-72" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs…" />
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading jobs…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted italic">No jobs found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((j) => (
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
                    <button onClick={() => navigate(`/chairman/jobs/${j.id}/edit`)} className="p-2 hover:bg-white rounded-xl">
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

