import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { Job } from '../../types';
import { logAudit } from '../../lib/audit';

export default function ChairmanEditJobPage() {
  const params = useParams();
  const navigate = useNavigate();
  const jobId = params.jobId || '';
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!jobId) return;
      const snap = await getDoc(doc(db, 'jobs', jobId));
      setJob(snap.exists() ? ({ id: snap.id, ...snap.data() } as Job) : null);
      setLoading(false);
    };
    run();
  }, [jobId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'jobs', job.id), { ...job, updatedAt: serverTimestamp() } as any);
      await logAudit('chairman:job:update', { jobId: job.id });
      navigate('/chairman/jobs');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-card flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) return <div className="premium-card text-sm text-muted italic">Job not found.</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Edit Job</h1>
        <p className="text-sm text-muted font-medium">Update vacancy details.</p>
      </div>

      <form onSubmit={save} className="premium-card space-y-4">
        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Job Title</label>
          <input className="input-field" value={job.title} onChange={(e) => setJob((p) => (p ? { ...p, title: e.target.value } : p))} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">District</label>
            <input className="input-field" value={job.district} onChange={(e) => setJob((p) => (p ? { ...p, district: e.target.value } : p))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Occupation</label>
            <input className="input-field" value={job.occupation} onChange={(e) => setJob((p) => (p ? { ...p, occupation: e.target.value } : p))} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Description</label>
          <textarea rows={6} className="input-field py-3" value={job.description} onChange={(e) => setJob((p) => (p ? { ...p, description: e.target.value } : p))} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Qualifications</label>
          <textarea rows={6} className="input-field py-3" value={job.qualifications} onChange={(e) => setJob((p) => (p ? { ...p, qualifications: e.target.value } : p))} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">
            Cancel
          </button>
          <button disabled={saving} type="submit" className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

