import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Ban, Download, Eye, FileUp, ListChecks, Printer, ShieldBan, Trash2, Users } from 'lucide-react';
import { DISTRICTS, WARDS, type District } from '../../constants/locations';
import { auth, db } from '../../lib/firebase';
import { pushManyToAdministratorQueue, pushToAdministratorQueue } from '../../lib/administratorApprovals';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Modal } from '../../components/Modal';
import type { UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import { getSignedDownloadUrl } from '../../lib/uploads';

type BulkSize = 50 | 100 | 150 | 250;

function escapeCsvCell(v: any) {
  const s = String(v ?? '');
  const needs = /[",\n]/.test(s);
  const out = s.replace(/"/g, '""');
  return needs ? `"${out}"` : out;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ChairmanApprovalsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<District | 'all'>('all');
  const [ward, setWard] = useState<string>('all');
  const [q, setQ] = useState('');
  const [occupation, setOccupation] = useState<string>('all');
  const [ageBand, setAgeBand] = useState<'all' | '18-24' | '25-34' | '35-44' | '45+'>('all');

  const [adminApprovals, setAdminApprovals] = useState<Record<string, any>>({});
  const [administratorIds, setAdministratorIds] = useState<string[]>([]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'selected' | 'top'>('selected');
  const [bulkSize, setBulkSize] = useState<BulkSize>(50);

  const [pushOpen, setPushOpen] = useState(false);
  const [pushCandidate, setPushCandidate] = useState<UserProfile | null>(null);
  const [pushRemarks, setPushRemarks] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
  const [pushError, setPushError] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');

  const ageForDob = (dob?: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age;
  };

  useEffect(() => {
    setLoading(true);
    const base = collection(db, 'users');
    const qy =
      district === 'all'
        ? query(base, where('role', '==', 'candidate'), orderBy('createdAt', 'desc'), limit(1200))
        : query(base, where('role', '==', 'candidate'), where('district', '==', district), orderBy('createdAt', 'desc'), limit(1200));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as UserProfile));
        setItems(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, [district]);

  useEffect(() => {
    const qy = query(collection(db, 'administratorApprovals'), orderBy('updatedAt', 'desc'), limit(2000));
    const unsub = onSnapshot(qy, (snap) => {
      const map: Record<string, any> = {};
      for (const d of snap.docs) map[d.id] = { id: d.id, ...d.data() };
      setAdminApprovals(map);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const run = async () => {
      const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['administrator', 'Administrator']), limit(50)));
      setAdministratorIds(snap.docs.map((d) => d.id));
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((c) => {
      if (ward !== 'all' && c.ward !== ward) return false;
      if (occupation !== 'all' && (c.occupation || '').toLowerCase() !== occupation.toLowerCase()) return false;
      if (qq) {
        const hay = `${c.fullName || ''} ${c.phoneNumber || ''} ${c.candidateIndex || ''} ${c.occupation || ''}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      if (ageBand !== 'all') {
        const age = ageForDob(c.dob) ?? -1;
        if (ageBand === '18-24' && (age < 18 || age > 24)) return false;
        if (ageBand === '25-34' && (age < 25 || age > 34)) return false;
        if (ageBand === '35-44' && (age < 35 || age > 44)) return false;
        if (ageBand === '45+' && age < 45) return false;
      }
      return true;
    });
  }, [ageBand, items, occupation, q, ward]);

  const occupations = useMemo(() => {
    const set = new Set<string>();
    for (const c of items) if (c.occupation) set.add(c.occupation);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allOnPageSelected = useMemo(() => filtered.length > 0 && filtered.every((r) => selected[r.id]), [filtered, selected]);

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPageSelected) {
        for (const r of filtered) delete next[r.id];
      } else {
        for (const r of filtered) next[r.id] = true;
      }
      return next;
    });
  };

  const openPush = (c: UserProfile) => {
    setPushError('');
    setPushCandidate(c);
    setPushRemarks(adminApprovals[c.id]?.chairmanRemarks || '');
    setPushOpen(true);
  };

  const doPush = async () => {
    if (!profile) return;
    if (!auth.currentUser) {
      setPushError('You must be signed in to push profiles.');
      return;
    }
    if (!pushCandidate) return;
    setPushing(true);
    setPushError('');
    try {
      await pushToAdministratorQueue({
        candidate: pushCandidate,
        chairmanId: profile.id,
        chairmanRemarks: pushRemarks.trim(),
        administratorIds,
      });
      setPushOpen(false);
      setPushCandidate(null);
      setPushRemarks('');
    } catch (e: any) {
      setPushError(e?.message || 'Failed to push profile. Check permissions and connectivity.');
    } finally {
      setPushing(false);
      setPushConfirmOpen(false);
    }
  };

  const doBulkPush = async (mode: 'selected' | 'top') => {
    if (!profile) return;
    if (!auth.currentUser) {
      setPushError('You must be signed in to push profiles.');
      return;
    }
    const list = mode === 'selected' ? filtered.filter((c) => selected[c.id]) : filtered.slice(0, bulkSize);
    if (list.length === 0) return;
    setPushing(true);
    setPushError('');
    try {
      await pushManyToAdministratorQueue({
        candidates: list,
        chairmanId: profile.id,
        chairmanRemarks: pushRemarks.trim(),
        administratorIds,
      });
      setBulkOpen(false);
      setSelected({});
      setPushRemarks('');
    } catch (e: any) {
      setPushError(e?.message || 'Failed to push profiles. Check permissions and connectivity.');
    } finally {
      setPushing(false);
      setBulkConfirmOpen(false);
    }
  };

  const downloadCsv = () => {
    const cols: Array<keyof UserProfile> = ['candidateIndex', 'fullName', 'phoneNumber', 'district', 'ward', 'dob', 'education', 'occupation', 'address'];
    const header = cols.join(',');
    const rows = filtered.map((c) => cols.map((k) => escapeCsvCell((c as any)[k])).join(','));
    downloadTextFile(`candidates_${district}_${ward}.csv`, [header, ...rows].join('\n'));
  };

  const printList = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) return;
    const rows = filtered
      .slice(0, 500)
      .map(
        (c) => `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeCsvCell(c.candidateIndex || '')}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeCsvCell(c.fullName || '')}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeCsvCell(c.district || '')}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeCsvCell(c.ward || '')}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeCsvCell(c.occupation || '')}</td>
        </tr>`,
      )
      .join('');
    w.document.write(`
      <html><head><title>Candidate Profiles</title>
      <meta charset="utf-8" />
      <style>body{font-family:system-ui,Segoe UI,Arial;padding:20px} h1{margin:0 0 14px} table{width:100%;border-collapse:collapse;font-size:12px}</style>
      </head><body>
        <h1>Candidate Profiles</h1>
        <div style="margin-bottom:12px;color:#64748b;font-size:12px;">District: ${escapeCsvCell(district)} • Ward: ${escapeCsvCell(ward)} • Total: ${filtered.length}</div>
        <table>
          <thead><tr style="text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:#0b3d91;">
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Index</th>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Candidate</th>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">District</th>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Ward</th>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Occupation</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  const doDelete = async () => {
    if (!profile || !activeCandidate) return;
    await updateDoc(doc(db, 'users', activeCandidate.id), {
      archived: true,
      archivedAt: serverTimestamp(),
      archivedBy: profile.id,
      updatedAt: serverTimestamp(),
    } as any);
    setDeleteConfirmOpen(false);
    setActiveCandidate(null);
  };

  const doBan = async () => {
    if (!profile || !activeCandidate) return;
    await updateDoc(doc(db, 'users', activeCandidate.id), {
      banned: true,
      banReason: banReason.trim(),
      bannedAt: serverTimestamp(),
      bannedBy: profile.id,
      updatedAt: serverTimestamp(),
    } as any);
    setBanConfirmOpen(false);
    setActiveCandidate(null);
    setBanReason('');
  };

  const doUnban = async (c: UserProfile) => {
    if (!profile) return;
    await updateDoc(doc(db, 'users', c.id), {
      banned: false,
      banReason: '',
      unbannedAt: serverTimestamp(),
      unbannedBy: profile.id,
      updatedAt: serverTimestamp(),
    } as any);
  };

  const downloadCandidateFile = async (c: UserProfile, kind: 'cv' | 'documents' | 'photo') => {
    const ref = kind === 'cv' ? c.cvRef : kind === 'documents' ? c.documentsRef : c.photoRef;
    const url = kind === 'cv' ? c.cvUrl : kind === 'documents' ? c.documentsUrl : c.photoUrl;
    const fileUrl = ref ? await getSignedDownloadUrl(ref) : url;
    if (!fileUrl) return;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Approvals</h1>
            <p className="text-sm text-muted font-medium">Send candidate profiles to administrator for approvals.</p>
          </div>
        </div>
      </div>

      <div className="premium-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">District</div>
              <select
                className="input-field py-2 w-56"
                value={district}
                onChange={(e) => {
                  const next = e.target.value as any;
                  setDistrict(next);
                  setWard('all');
                }}
              >
                <option value="all">All Districts</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Ward</div>
              <select className="input-field py-2 w-56" value={ward} onChange={(e) => setWard(e.target.value)} disabled={district === 'all'}>
                <option value="all">All Wards</option>
                {(district === 'all' ? [] : WARDS[district] || []).map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Age</div>
              <select className="input-field py-2 w-40" value={ageBand} onChange={(e) => setAgeBand(e.target.value as any)}>
                <option value="all">All Ages</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45+">45+</option>
              </select>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Occupation</div>
              <select className="input-field py-2 w-56" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                <option value="all">All Occupations</option>
                {occupations.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="input-field pl-4 pr-4 py-2 w-full sm:w-80"
                placeholder="Search name/index/occupation…"
              />
            </div>
            <div className="text-xs text-muted font-bold uppercase tracking-widest whitespace-nowrap">{filtered.length} results</div>
            <button type="button" className="btn-outline py-2 px-3 text-xs" disabled={filtered.length === 0} onClick={printList} title="Print filtered list">
              <Printer className="w-4 h-4 mr-2" /> Print
            </button>
            <button type="button" className="btn-outline py-2 px-3 text-xs" disabled={filtered.length === 0} onClick={downloadCsv} title="Download filtered list as CSV">
              <Download className="w-4 h-4 mr-2" /> Download
            </button>
            <button
              type="button"
              className="btn-primary py-2 px-3 text-xs"
              disabled={filtered.length === 0}
              onClick={() => {
                setPushError('');
                setPushRemarks('');
                setBulkOpen(true);
              }}
              title="Push candidate profiles in bulk (uses current filters)"
            >
              <ListChecks className="w-4 h-4 mr-2" /> Bulk Push
            </button>
          </div>
        </div>

        {pushError ? <div className="alert-error">{pushError}</div> : null}

        {loading ? (
          <div className="text-sm text-muted font-medium">Loading candidates…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted italic">No candidates found for current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Select all filtered" />
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-28 whitespace-nowrap">Index</th>
                  <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] min-w-[220px]">Candidate</th>
                  <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-44 leading-tight whitespace-nowrap">
                    <span className="block">District</span>
                    <span className="block opacity-70">Ward</span>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden xl:table-cell w-28 whitespace-nowrap">DOB</th>
                  <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-52 whitespace-nowrap">Occupation</th>
                  <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-28 whitespace-nowrap">Admin</th>
                  <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] text-right w-56 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {filtered.slice(0, 500).map((c) => {
                  const appr = adminApprovals[c.id] || null;
                  const status: string = appr?.status || 'not_pushed';
                  const statusLabel = status === 'not_pushed' ? 'Not pushed' : status;
                  return (
                    <tr key={c.id} className="hover:bg-sky/20 transition-colors">
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={!!selected[c.id]}
                          onChange={(e) => setSelected((p) => ({ ...p, [c.id]: e.target.checked }))}
                          aria-label={`Select ${c.fullName || c.id}`}
                        />
                      </td>
                      <td className="px-4 py-4 align-top text-xs font-extrabold text-primary">{c.candidateIndex || '-'}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-extrabold text-navy leading-tight">{c.fullName || '-'}</div>
                        <div className="text-xs text-muted font-medium mt-1">{c.phoneNumber || '-'}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-muted font-medium">
                        <div className="font-bold text-navy/80">{c.district || '-'}</div>
                        <div>{c.ward || '-'}</div>
                      </td>
                      <td className="px-4 py-4 align-top hidden xl:table-cell text-xs text-muted font-medium whitespace-nowrap">{c.dob || '-'}</td>
                      <td className="px-4 py-4 align-top text-xs text-muted font-medium">{c.occupation || '-'}</td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={cn(
                            'status-pill',
                            status === 'approved'
                              ? 'status-approved'
                              : status === 'rejected'
                                ? 'status-rejected'
                                : status === 'pending'
                                  ? 'status-pending'
                                  : 'bg-slate-100 text-slate-700',
                          )}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={() => openPush(c)}>
                            <FileUp className="w-4 h-4 mr-2" /> Push
                          </button>
                          <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={() => downloadCandidateFile(c, 'cv')}>
                            <Download className="w-4 h-4 mr-2" /> CV
                          </button>
                          <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={() => downloadCandidateFile(c, 'documents')}>
                            <Download className="w-4 h-4 mr-2" /> Docs
                          </button>
                          <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={() => window.open(`/candidate/${c.id}`, '_blank')} title="Preview profile (opens new tab)">
                            <Eye className="w-4 h-4 mr-2" /> Preview
                          </button>
                          {(c as any).banned ? (
                            <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={() => doUnban(c)}>
                              <ShieldBan className="w-4 h-4 mr-2" /> Unban
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-outline py-2 px-3 text-xs"
                              onClick={() => {
                                setActiveCandidate(c);
                                setBanReason('');
                                setBanConfirmOpen(true);
                              }}
                            >
                              <Ban className="w-4 h-4 mr-2 text-danger" /> Ban
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-outline py-2 px-3 text-xs"
                            onClick={() => {
                              setActiveCandidate(c);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2 text-danger" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk push profiles"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted font-medium">Choose how to push profiles to the Administrator queue. Notes are optional.</div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setBulkMode('selected')}
              className={cn('premium-card p-4 text-left hover:bg-sky/20 transition-colors', bulkMode === 'selected' && 'ring-2 ring-primary')}
            >
              <div className="text-sm font-extrabold text-navy">Push selected</div>
              <div className="text-xs text-muted font-medium mt-1">{selectedIds.length} selected</div>
            </button>

            <button
              type="button"
              onClick={() => setBulkMode('top')}
              className={cn('premium-card p-4 text-left hover:bg-sky/20 transition-colors', bulkMode === 'top' && 'ring-2 ring-primary')}
            >
              <div className="text-sm font-extrabold text-navy">Push top results</div>
              <div className="text-xs text-muted font-medium mt-1">Will push {Math.min(filtered.length, bulkSize)} filtered</div>
            </button>
          </div>

          {bulkMode === 'top' ? (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Batch size</div>
              <select className="input-field py-2 w-40" value={bulkSize} onChange={(e) => setBulkSize(Number(e.target.value) as BulkSize)}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={250}>250</option>
              </select>
            </div>
          ) : null}

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Chairman notes (optional)</div>
            <textarea className="input-field min-h-[110px]" value={pushRemarks} onChange={(e) => setPushRemarks(e.target.value)} placeholder="Add context, risk notes, and supporting remarks…" />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-outline justify-center py-3" onClick={() => setBulkOpen(false)} disabled={pushing}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary justify-center py-3"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={pushing || (bulkMode === 'selected' ? selectedIds.length === 0 : filtered.length === 0)}
            >
              <FileUp className="w-4 h-4 mr-2" /> Push profiles
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={bulkConfirmOpen}
        title="Confirm bulk push"
        description={
          bulkMode === 'selected'
            ? `Push ${selectedIds.length} selected candidate profiles to the Administrator queue?`
            : `Push ${Math.min(filtered.length, bulkSize)} candidate profiles (top filtered results) to the Administrator queue?`
        }
        confirmText={pushing ? 'Pushing…' : 'Push profiles'}
        tone="primary"
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={() => doBulkPush(bulkMode)}
      />

      <Modal open={pushOpen} onClose={() => setPushOpen(false)} title={`Push profile — ${pushCandidate?.fullName || ''}`} size="lg">
        <div className="space-y-4">
          <div className="text-sm text-muted font-medium">Sends this candidate profile to the Administrator approval queue and enables real-time status sync.</div>
          {pushError ? <div className="alert-error">{pushError}</div> : null}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Chairman remarks (optional)</div>
            <textarea className="input-field min-h-[150px]" value={pushRemarks} onChange={(e) => setPushRemarks(e.target.value)} placeholder="Add context, risk notes, and supporting remarks…" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-outline justify-center py-3" onClick={() => setPushOpen(false)} disabled={pushing}>
              Cancel
            </button>
            <button type="button" className="btn-primary justify-center py-3" onClick={() => setPushConfirmOpen(true)} disabled={pushing}>
              <FileUp className="w-4 h-4 mr-2" /> {pushing ? 'Pushing…' : 'Push to Administrator'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={pushConfirmOpen}
        title="Confirm push"
        description="Push this candidate profile to the Administrator approval queue?"
        confirmText={pushing ? 'Pushing…' : 'Push profile'}
        tone="primary"
        onClose={() => setPushConfirmOpen(false)}
        onConfirm={doPush}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete candidate"
        description="This archives the candidate record (recoverable by Developer). Continue?"
        confirmText="Delete"
        tone="danger"
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={doDelete}
      />

      <Modal open={banConfirmOpen} onClose={() => setBanConfirmOpen(false)} title={`Ban candidate — ${activeCandidate?.fullName || ''}`} size="lg">
        <div className="space-y-4">
          <div className="text-sm text-muted font-medium">Banned candidates cannot access the portal. Provide an optional reason.</div>
          <textarea className="input-field min-h-[120px]" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason (optional)…" />
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-outline justify-center py-3" onClick={() => setBanConfirmOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary justify-center py-3" onClick={doBan}>
              <Ban className="w-4 h-4 mr-2" /> Ban
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
