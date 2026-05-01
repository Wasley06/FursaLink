import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { FileText, Search } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { AdministratorApproval } from '../../lib/administratorApprovals';
import { cn } from '../../lib/utils';
import { getSignedDownloadUrl } from '../../lib/uploads';

function statusPill(status: any) {
  return status === 'approved' ? 'status-pill status-approved' : status === 'rejected' ? 'status-pill status-rejected' : 'status-pill status-pending';
}

export default function AdministratorDossiersPage() {
  const [items, setItems] = useState<AdministratorApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const qy = query(collection(db, 'administratorApprovals'), orderBy('updatedAt', 'desc'), limit(1000));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => {
      return (
        (i.candidateName || '').toLowerCase().includes(needle) ||
        (i.candidateIndex || '').toLowerCase().includes(needle) ||
        (i.phoneNumber || '').toLowerCase().includes(needle) ||
        (i.district || '').toLowerCase().includes(needle) ||
        (i.ward || '').toLowerCase().includes(needle)
      );
    });
  }, [items, q]);

  const openFile = async (file: { url?: string; ref?: any }) => {
    setError('');
    try {
      if (file.url) {
        window.open(file.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (file.ref) {
        const signed = await getSignedDownloadUrl(file.ref);
        window.open(signed, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to open file.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">Candidate Profiles</h1>
            <p className="text-sm text-muted font-medium">Uploaded files and profile documents (real-time).</p>
          </div>
          <div className="relative w-80 max-w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input className="glass-input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search profiles…" />
          </div>
        </div>
      </div>

      <div className="premium-card">
        {error ? <div className="mb-4 text-sm font-bold text-danger">{error}</div> : null}
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading profiles…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted italic">No profiles found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District / Ward</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Files</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {filtered.slice(0, 500).map((d) => (
                  <tr key={d.id} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-navy">{d.candidateName || d.userId}</div>
                      <div className="text-[11px] text-muted font-medium">
                        {(d.candidateIndex || '—')}{d.phoneNumber ? ` • ${d.phoneNumber}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {d.district || '—'} / {d.ward || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(statusPill(d.status))}>{(d.status || 'pending') as any}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(d.cvUrl || (d as any).cvRef) ? (
                          <button className="btn-outline py-2 px-3 text-xs" type="button" onClick={() => openFile({ url: d.cvUrl, ref: (d as any).cvRef })}>
                            CV
                          </button>
                        ) : null}
                        {(d.documentsUrl || (d as any).documentsRef) ? (
                          <button className="btn-outline py-2 px-3 text-xs" type="button" onClick={() => openFile({ url: d.documentsUrl, ref: (d as any).documentsRef })}>
                            Docs
                          </button>
                        ) : null}
                        {(d.photoUrl || (d as any).photoRef) ? (
                          <button className="btn-outline py-2 px-3 text-xs" type="button" onClick={() => openFile({ url: d.photoUrl, ref: (d as any).photoRef })}>
                            Photo
                          </button>
                        ) : null}
                        {!d.cvUrl && !(d as any).cvRef && !d.documentsUrl && !(d as any).documentsRef && !d.photoUrl && !(d as any).photoRef ? (
                          <span className="text-xs text-muted font-bold uppercase tracking-widest">None</span>
                        ) : null}
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
