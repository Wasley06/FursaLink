import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ArchiveRestore, Ban, Search, ShieldCheck } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import type { UserProfile } from '../../types';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function DeveloperRecoveryPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'archived' | 'banned'>('archived');
  const [active, setActive] = useState<UserProfile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const qy = query(collection(db, 'users'), orderBy('updatedAt', 'desc'), limit(1200));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        setItems(all.filter((u: any) => u.role === 'candidate'));
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Failed to load users.');
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((u: any) => {
      if (tab === 'archived' && u.archived !== true) return false;
      if (tab === 'banned' && u.banned !== true) return false;
      if (!needle) return true;
      return (
        String(u.fullName || '').toLowerCase().includes(needle) ||
        String(u.phoneNumber || '').toLowerCase().includes(needle) ||
        String(u.contactEmail || '').toLowerCase().includes(needle) ||
        String(u.district || '').toLowerCase().includes(needle) ||
        String(u.ward || '').toLowerCase().includes(needle)
      );
    });
  }, [items, q, tab]);

  const openRestore = (u: UserProfile) => {
    setError('');
    setActive(u);
    setConfirmOpen(true);
  };

  const restoreNow = async () => {
    if (!active?.id) return;
    setSaving(true);
    setError('');
    try {
      if (tab === 'archived') {
        await updateDoc(doc(db, 'users', active.id), {
          archived: false,
          archivedAt: null,
          archivedBy: '',
          restoredAt: serverTimestamp(),
          restoredBy: profile?.id || '',
          updatedAt: serverTimestamp(),
        } as any);
      } else {
        await updateDoc(doc(db, 'users', active.id), {
          banned: false,
          banReason: '',
          unbannedAt: serverTimestamp(),
          unbannedBy: profile?.id || '',
          updatedAt: serverTimestamp(),
        } as any);
      }
      setConfirmOpen(false);
      setActive(null);
    } catch (e: any) {
      setError(e?.message || 'Recovery failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted">Developer</div>
            <h1 className="text-2xl font-extrabold text-navy mt-2">Recovery</h1>
            <p className="text-sm text-muted font-medium mt-2">
              Restore archived candidates and unban locked accounts. Hard-deleted demo records cannot be recovered.
            </p>
          </div>
          <div className="relative w-80 max-w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input className="glass-input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
          </div>
        </div>
      </div>

      <div className="premium-card">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('archived')}
            className={cn(
              'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
              tab === 'archived' ? 'bg-white text-navy shadow-sm' : 'text-navy/60 hover:text-navy hover:bg-white/40',
            )}
          >
            Archived
          </button>
          <button
            type="button"
            onClick={() => setTab('banned')}
            className={cn(
              'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
              tab === 'banned' ? 'bg-white text-navy shadow-sm' : 'text-navy/60 hover:text-navy hover:bg-white/40',
            )}
          >
            Banned
          </button>
        </div>

        {error ? <div className="mt-4 text-sm font-bold text-danger">{error}</div> : null}
        {loading ? (
          <div className="mt-4 text-sm text-muted font-medium">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 text-sm text-muted italic">No records found.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District/Ward</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {filtered.slice(0, 500).map((u: any) => (
                  <tr key={u.id} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-extrabold text-navy">{u.fullName || u.id}</div>
                      <div className="text-[11px] text-muted font-medium">{u.phoneNumber || '—'}{u.contactEmail ? ` • ${u.contactEmail}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">{u.district || '—'} / {u.ward || '—'}</td>
                    <td className="px-6 py-4">
                      {tab === 'archived' ? (
                        <span className="status-pill status-pending">archived</span>
                      ) : (
                        <span className="status-pill status-rejected">banned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="btn-primary py-2 px-3 text-xs whitespace-nowrap"
                        onClick={() => openRestore(u)}
                      >
                        {tab === 'archived' ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                        {tab === 'archived' ? 'Restore' : 'Unban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={tab === 'archived' ? 'Restore candidate' : 'Unban candidate'}
        description={tab === 'archived' ? 'This will restore the candidate back into the directory.' : 'This will restore portal access for the candidate.'}
        confirmText={tab === 'archived' ? 'Restore' : 'Unban'}
        loading={saving}
        onConfirm={restoreNow}
      />
    </div>
  );
}

