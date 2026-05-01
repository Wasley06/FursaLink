import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { CheckCircle2, Clock, FileCheck, Search, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { DISTRICTS, WARDS, type District } from '../../constants/locations';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { decideAdministratorApproval, type AdministratorApproval, type AdministratorApprovalStatus } from '../../lib/administratorApprovals';
import { cn } from '../../lib/utils';
import type { UserProfile } from '../../types';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Modal } from '../../components/Modal';
import { getSignedDownloadUrl } from '../../lib/uploads';

type StatusFilter = AdministratorApprovalStatus | 'all';

function statusPill(status: AdministratorApprovalStatus) {
  return status === 'approved' ? 'status-pill status-approved' : status === 'rejected' ? 'status-pill status-rejected' : 'status-pill status-pending';
}

function statusTone(status: AdministratorApprovalStatus) {
  return status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
}

function asString(v: any) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function CandidateDossierModal({
  open,
  row,
  onClose,
  onDecide,
  deciding,
}: {
  open: boolean;
  row: AdministratorApproval | null;
  deciding: boolean;
  onClose: () => void;
  onDecide: (status: AdministratorApprovalStatus, notes: string) => void;
}) {
  const [candidate, setCandidate] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (!open || !row?.userId) return;
    setNotes(row.adminNotes || '');
  }, [open, row?.adminNotes, row?.userId]);

  useEffect(() => {
    if (!open || !row?.userId) return;
    const unsub = onSnapshot(doc(db, 'users', row.userId), (snap) => {
      setCandidate(snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null);
    });
    return () => unsub();
  }, [open, row?.userId]);

  useEffect(() => {
    if (!open || !row?.id) return;
    const qy = query(
      collection(db, 'administratorApprovalEvents'),
      where('approvalId', '==', row.id),
      orderBy('createdAt', 'asc'),
      limit(50),
    );
    const unsub = onSnapshot(qy, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [open, row?.id]);

  const files = useMemo(() => {
    if (!row) return [];
    return [
      { label: 'CV', url: row.cvUrl || '', ref: (row as any).cvRef || null },
      { label: 'Documents', url: row.documentsUrl || '', ref: (row as any).documentsRef || null },
      { label: 'Profile photo', url: row.photoUrl || '', ref: (row as any).photoRef || null },
    ].filter((f) => !!f.url || !!f.ref);
  }, [row]);

  const openFile = async (f: { label: string; url: string; ref: any }) => {
    setFileError('');
    try {
      if (f.url) {
        window.open(f.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (f.ref) {
        const signed = await getSignedDownloadUrl(f.ref);
        window.open(signed, '_blank', 'noopener,noreferrer');
        return;
      }
      setFileError('File is not available.');
    } catch (e: any) {
      setFileError(e?.message || 'Failed to open file.');
    }
  };

  const name = candidate?.fullName || row?.candidateName || row?.userId || '';
  const index = candidate?.candidateIndex || row?.candidateIndex || '';
  const district = candidate?.district || row?.district || '';
  const ward = candidate?.ward || row?.ward || '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Candidate Dossier — ${name}${index ? ` (${index})` : ''}`}
      footer={
        row ? (
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="text-xs text-muted font-bold uppercase tracking-widest">
              Status: <span className={cn(statusPill(row.status), 'ml-2')}>{row.status}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={deciding}
                onClick={() => onDecide('pending', notes)}
                className="btn-primary border-none bg-warning hover:bg-warning/90 py-3 justify-center"
              >
                <Clock className="w-4 h-4 mr-2" /> Pending
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={deciding}
                onClick={() => onDecide('rejected', notes)}
                className="btn-primary border-none bg-danger hover:bg-danger/90 py-3 justify-center"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={deciding}
                onClick={() => onDecide('approved', notes)}
                className="btn-primary border-none bg-emerald hover:bg-emerald/90 py-3 justify-center"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
              </motion.button>
            </div>
          </div>
        ) : null
      }
    >
      {!row ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="premium-card">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Profile</div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Name</div>
                  <div className="text-navy font-extrabold">{name || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Phone</div>
                  <div className="text-navy font-extrabold">{candidate?.phoneNumber || row.phoneNumber || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">District</div>
                  <div className="text-navy font-extrabold">{district || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Ward</div>
                  <div className="text-navy font-extrabold">{ward || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Occupation</div>
                  <div className="text-navy font-extrabold">{candidate?.occupation || row.occupation || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Index</div>
                  <div className="text-navy font-extrabold">{index || '—'}</div>
                </div>
              </div>
            </div>

            <div className="premium-card">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Chairman Remarks</div>
              <div className="mt-3 text-sm text-navy font-medium whitespace-pre-line">
                {row.chairmanRemarks?.trim() ? row.chairmanRemarks : <span className="text-muted italic">No remarks.</span>}
              </div>
            </div>

            <div className="premium-card">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Administrator Notes</div>
              <textarea
                rows={5}
                className="input-field mt-3 py-3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes and rationale…"
              />
            </div>

            <div className="premium-card">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Timestamp History</div>
              <div className="mt-4 space-y-2">
                {events.length === 0 ? (
                  <div className="text-sm text-muted italic">No history yet.</div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs font-black uppercase tracking-widest text-primary">{asString(ev.action)}</div>
                        <div className="text-[11px] text-muted font-bold">
                          {asString(ev.createdAt?.toDate?.() || ev.createdAt || '')}
                        </div>
                      </div>
                      {asString(ev.message).trim() ? (
                        <div className="text-sm text-navy font-medium mt-2 whitespace-pre-line">{asString(ev.message)}</div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="premium-card">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Uploaded Files</div>
              {fileError ? <div className="mt-3 text-xs font-bold text-danger">{fileError}</div> : null}
              <div className="mt-4 space-y-2">
                {files.length === 0 ? (
                  <div className="text-sm text-muted italic">No files attached.</div>
                ) : (
                  files.map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => openFile(f)}
                      className="btn-outline w-full justify-center py-3 text-xs font-black uppercase tracking-widest"
                    >
                      Open {f.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="premium-card">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">Background Summary</div>
              <div className="mt-3 text-sm text-muted font-medium">
                {candidate ? (
                  <>
                    <div className="text-navy font-extrabold">{candidate.education || '—'}</div>
                    <div className="mt-2">
                      {candidate.skills ? candidate.skills : <span className="italic">No skills provided.</span>}
                    </div>
                    <div className="mt-3 text-[11px] font-bold uppercase tracking-widest">
                      Experience: <span className="text-navy">{candidate.experience ?? '—'}</span>
                    </div>
                  </>
                ) : (
                  <span className="italic">Profile not available.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AdministratorApprovalsPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState<AdministratorApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState<District | 'all'>('all');
  const [ward, setWard] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [occupation, setOccupation] = useState<string>('all');
  const [ageBand, setAgeBand] = useState<'all' | '18-24' | '25-34' | '35-44' | '45+'>('all');

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<AdministratorApprovalStatus>('pending');
  const [deciding, setDeciding] = useState(false);

  const [activeRow, setActiveRow] = useState<AdministratorApproval | null>(null);
  const [rowConfirmOpen, setRowConfirmOpen] = useState(false);
  const [rowNextStatus, setRowNextStatus] = useState<AdministratorApprovalStatus>('pending');
  const [rowNextNotes, setRowNextNotes] = useState('');

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
    const base = collection(db, 'administratorApprovals');
    const qy = query(base, orderBy('updatedAt', 'desc'), limit(1000));
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

  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const d = qp.get('district');
    const w = qp.get('ward');
    const s = qp.get('status');
    const cat = qp.get('category');
    const qq = qp.get('q');

    if (d && (DISTRICTS as any).includes(d)) setDistrict(d as any);
    if (w) setWard(w);
    if (s === 'pending' || s === 'approved' || s === 'rejected') setStatus(s);
    if (cat) setOccupation(cat);
    if (qq) setQ(qq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wards = useMemo(() => {
    if (district === 'all') return [];
    return WARDS[district] || [];
  }, [district]);

  const occupations = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) {
      const o = (i.occupation || '').trim();
      if (o) set.add(o);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 60);
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (district !== 'all' && (i.district || '') !== district) return false;
      if (ward !== 'all' && (i.ward || '') !== ward) return false;
      if (status !== 'all' && i.status !== status) return false;
      if (occupation !== 'all' && (i.occupation || '') !== occupation) return false;
      if (ageBand !== 'all') {
        const age = ageForDob((i as any).dob);
        if (age == null) return false;
        if (ageBand === '18-24' && (age < 18 || age > 24)) return false;
        if (ageBand === '25-34' && (age < 25 || age > 34)) return false;
        if (ageBand === '35-44' && (age < 35 || age > 44)) return false;
        if (ageBand === '45+' && age < 45) return false;
      }
      if (!needle) return true;
      return (
        (i.candidateName || '').toLowerCase().includes(needle) ||
        (i.candidateIndex || '').toLowerCase().includes(needle) ||
        (i.phoneNumber || '').toLowerCase().includes(needle) ||
        (i.userId || '').toLowerCase().includes(needle)
      );
    });
  }, [ageBand, district, items, occupation, q, status, ward]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allVisibleSelected = useMemo(
    () => filtered.length > 0 && filtered.every((r) => selected[r.id]),
    [filtered, selected],
  );

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelected((p) => {
        const next = { ...p };
        for (const r of filtered) delete next[r.id];
        return next;
      });
      return;
    }
    setSelected((p) => {
      const next = { ...p };
      for (const r of filtered) next[r.id] = true;
      return next;
    });
  };

  const decideOne = async (row: AdministratorApproval, nextStatus: AdministratorApprovalStatus, notes: string) => {
    if (!profile) return;
    setDeciding(true);
    setActionError('');
    try {
      await decideAdministratorApproval({
        approvalId: row.id,
        adminId: profile.id,
        status: nextStatus,
        adminNotes: notes,
        notifyChairmanId: row.pushedBy || null,
      });
      setItems((p) => p.map((x) => (x.id === row.id ? { ...x, status: nextStatus, adminNotes: notes } : x)));
    } catch (e: any) {
      setActionError(e?.message || 'Failed to update dossier status. Check connectivity and Firestore rules.');
    } finally {
      setDeciding(false);
    }
  };

  const decideBulk = async () => {
    if (!profile) return;
    const ids = selectedIds;
    if (ids.length === 0) return;
    setDeciding(true);
    setActionError('');
    try {
      const byId: Record<string, AdministratorApproval> = {};
      for (const i of items) byId[i.id] = i;
      for (const id of ids) {
        const row = byId[id];
        if (!row) continue;
        await decideAdministratorApproval({
          approvalId: id,
          adminId: profile.id,
          status: confirmStatus,
          adminNotes: row.adminNotes || '',
          notifyChairmanId: row.pushedBy || null,
        });
      }
      setItems((p) => p.map((x) => (selected[x.id] ? { ...x, status: confirmStatus } : x)));
      setSelected({});
    } catch (e: any) {
      setActionError(e?.message || 'Bulk update failed. Some items may not have updated.');
    } finally {
      setDeciding(false);
      setConfirmOpen(false);
    }
  };

  const openRowDecision = (next: AdministratorApprovalStatus, notes: string) => {
    setRowNextStatus(next);
    setRowNextNotes(notes);
    setRowConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">Approval Management</h1>
            <p className="text-sm text-muted font-medium">Review dossiers, add notes, and decide with full history.</p>
          </div>
          <div className="relative w-80 max-w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              className="glass-input pl-11"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name/index/phone…"
            />
          </div>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-bold text-danger">
          {actionError}
        </div>
      ) : null}

      <div className="premium-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
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
            <select className="input-field py-2 w-56" value={ward} onChange={(e) => setWard(e.target.value)} disabled={district === 'all'}>
              <option value="all">All Wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select className="input-field py-2 w-56" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="input-field py-2 w-40" value={ageBand} onChange={(e) => setAgeBand(e.target.value as any)}>
              <option value="all">All Ages</option>
              <option value="18-24">18–24</option>
              <option value="25-34">25–34</option>
              <option value="35-44">35–44</option>
              <option value="45+">45+</option>
            </select>
            <select className="input-field py-2 w-72" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
              <option value="all">All Categories</option>
              {occupations.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-muted font-bold uppercase tracking-widest">
            {filtered.length} results • {selectedIds.length} selected
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-sm font-extrabold text-navy">Bulk actions</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={deciding}
                onClick={() => {
                  setConfirmStatus('pending');
                  setConfirmOpen(true);
                }}
                className="btn-primary border-none bg-warning hover:bg-warning/90 py-3 justify-center"
              >
                <Clock className="w-4 h-4 mr-2" /> Pending
              </button>
              <button
                type="button"
                disabled={deciding}
                onClick={() => {
                  setConfirmStatus('rejected');
                  setConfirmOpen(true);
                }}
                className="btn-primary border-none bg-danger hover:bg-danger/90 py-3 justify-center"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </button>
              <button
                type="button"
                disabled={deciding}
                onClick={() => {
                  setConfirmStatus('approved');
                  setConfirmOpen(true);
                }}
                className="btn-primary border-none bg-emerald hover:bg-emerald/90 py-3 justify-center"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-muted font-medium">Loading approval queue…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted italic">No dossiers in queue.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-sky/50">
                  <tr>
                    <th className="px-6 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
                      />
                    </th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Candidate</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District / Ward</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Category</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky">
                  {filtered.slice(0, 500).map((r) => (
                    <tr key={r.id} className="hover:bg-sky/20 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={!!selected[r.id]}
                          onChange={(e) => setSelected((p) => ({ ...p, [r.id]: e.target.checked }))}
                          className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setActiveRow(r)}
                          className="text-left group"
                          title="Open dossier"
                        >
                          <div className="text-sm font-extrabold text-navy group-hover:text-primary transition-colors">
                            {r.candidateName || r.userId}
                          </div>
                          <div className="text-[11px] text-muted font-medium">
                            {(r.candidateIndex || '—')}{r.phoneNumber ? ` • ${r.phoneNumber}` : ''}
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">
                        {r.district || '—'} / {r.ward || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">{r.occupation || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={statusPill(r.status)}>{r.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={deciding}
                            onClick={() => {
                              setActiveRow(r);
                              openRowDecision('approved', r.adminNotes || '');
                            }}
                            className="btn-primary border-none bg-emerald hover:bg-emerald/90 py-2 px-3 text-xs"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={deciding}
                            onClick={() => {
                              setActiveRow(r);
                              openRowDecision('rejected', r.adminNotes || '');
                            }}
                            className="btn-primary border-none bg-danger hover:bg-danger/90 py-2 px-3 text-xs"
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Reject
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={deciding}
                            onClick={() => {
                              setActiveRow(r);
                              openRowDecision('pending', r.adminNotes || '');
                            }}
                            className="btn-primary border-none bg-warning hover:bg-warning/90 py-2 px-3 text-xs"
                          >
                            <Clock className="w-4 h-4 mr-2" /> Pending
                          </motion.button>
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

      <CandidateDossierModal
        open={!!activeRow}
        row={activeRow}
        deciding={deciding}
        onClose={() => setActiveRow(null)}
        onDecide={(s, notes) => {
          if (!activeRow) return;
          setActiveRow(activeRow);
          setRowNextStatus(s);
          setRowNextNotes(notes);
          setRowConfirmOpen(true);
        }}
      />

      <ConfirmModal
        open={rowConfirmOpen}
        title={`Confirm: set status to ${rowNextStatus.toUpperCase()}`}
        description={
          activeRow
            ? `Candidate: ${activeRow.candidateName || activeRow.userId}\nThis updates instantly for the chairman and all devices.`
            : ''
        }
        tone={statusTone(rowNextStatus)}
        confirmText={`Set ${rowNextStatus.toUpperCase()}`}
        loading={deciding}
        onClose={() => setRowConfirmOpen(false)}
        onConfirm={async () => {
          if (!activeRow) return;
          setRowConfirmOpen(false);
          await decideOne(activeRow, rowNextStatus, rowNextNotes);
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        title={`Confirm bulk action: ${confirmStatus.toUpperCase()}`}
        description={`Applies to ${selectedIds.length} dossiers. This updates instantly in the database and syncs across roles.`}
        tone={statusTone(confirmStatus)}
        confirmText={`Apply ${confirmStatus.toUpperCase()}`}
        loading={deciding}
        onClose={() => setConfirmOpen(false)}
        onConfirm={decideBulk}
      />
    </div>
  );
}
