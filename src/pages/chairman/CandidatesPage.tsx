import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Ban, Download, Eye, Pencil, Printer, Trash2, Users } from 'lucide-react';
import { DISTRICTS, WARDS, type District } from '../../constants/locations';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getSignedDownloadUrl } from '../../lib/uploads';

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

export default function ChairmanCandidatesPage() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<District | 'all'>('all');
  const [ward, setWard] = useState<string>('all');
  const [q, setQ] = useState('');
  const [occupation, setOccupation] = useState<string>('all');
  const [ageBand, setAgeBand] = useState<'all' | '18-24' | '25-34' | '35-44' | '45+'>('all');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<UserProfile | null>(null);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    contactEmail: '',
    district: '',
    ward: '',
    dob: '',
    education: '',
    occupation: '',
    address: '',
  });

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
        ? query(base, where('role', '==', 'candidate'), limit(800))
        : query(base, where('role', '==', 'candidate'), where('district', '==', district), limit(800));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [district]);

  const wards = useMemo(() => {
    if (district === 'all') return [];
    return WARDS[district] || [];
  }, [district]);

  const occupationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of items) {
      const o = (c.occupation || '').trim();
      if (o) set.add(o);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 120);
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((c) => {
      if ((c as any).archived === true) return false;
      if (ward !== 'all' && (c.ward || '') !== ward) return false;
      if (occupation !== 'all' && (c.occupation || '') !== occupation) return false;
      if (ageBand !== 'all') {
        const age = ageForDob(c.dob);
        if (age == null) return false;
        if (ageBand === '18-24' && (age < 18 || age > 24)) return false;
        if (ageBand === '25-34' && (age < 25 || age > 34)) return false;
        if (ageBand === '35-44' && (age < 35 || age > 44)) return false;
        if (ageBand === '45+' && age < 45) return false;
      }
      if (!needle) return true;
      return (
        (c.fullName || '').toLowerCase().includes(needle) ||
        (c.phoneNumber || '').toLowerCase().includes(needle) ||
        (c.candidateIndex || '').toLowerCase().includes(needle) ||
        (c.occupation || '').toLowerCase().includes(needle) ||
        (c.district || '').toLowerCase().includes(needle) ||
        (c.ward || '').toLowerCase().includes(needle)
      );
    });
  }, [ageBand, items, occupation, q, ward]);

  const openPreview = (c: UserProfile) => {
    setCandidateError('');
    setActiveCandidate(c);
    setPreviewOpen(true);
  };

  const openEdit = (c: UserProfile) => {
    setCandidateError('');
    setActiveCandidate(c);
    setEditForm({
      fullName: c.fullName || '',
      phoneNumber: c.phoneNumber || '',
      contactEmail: (c as any).contactEmail || (c as any).email || '',
      district: c.district || '',
      ward: c.ward || '',
      dob: c.dob || '',
      education: c.education || '',
      occupation: c.occupation || '',
      address: c.address || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!activeCandidate?.id) return;
    setSavingCandidate(true);
    setCandidateError('');
    try {
      await updateDoc(doc(db, 'users', activeCandidate.id), {
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        contactEmail: editForm.contactEmail.trim(),
        district: editForm.district,
        ward: editForm.ward,
        dob: editForm.dob,
        education: editForm.education,
        occupation: editForm.occupation,
        address: editForm.address,
        updatedAt: serverTimestamp(),
      } as any);
      setEditOpen(false);
    } catch (e: any) {
      setCandidateError(e?.message || 'Failed to update candidate.');
    } finally {
      setSavingCandidate(false);
    }
  };

  const openDelete = (c: UserProfile) => {
    setCandidateError('');
    setActiveCandidate(c);
    setDeleteConfirmOpen(true);
  };

  const openBan = (c: UserProfile) => {
    setCandidateError('');
    setActiveCandidate(c);
    setBanReason((c as any).banReason || '');
    setBanConfirmOpen(true);
  };

  const archiveOrDelete = async () => {
    if (!activeCandidate?.id) return;
    setSavingCandidate(true);
    setCandidateError('');
    try {
      const isDemo = (activeCandidate as any).isDemo === true;
      if (isDemo) {
        await deleteDoc(doc(db, 'users', activeCandidate.id));
      } else {
        await updateDoc(doc(db, 'users', activeCandidate.id), {
          archived: true,
          archivedAt: serverTimestamp(),
          archivedBy: 'chairman',
          updatedAt: serverTimestamp(),
        } as any);
      }
      setDeleteConfirmOpen(false);
      setPreviewOpen(false);
      setEditOpen(false);
    } catch (e: any) {
      setCandidateError(e?.message || 'Failed to delete candidate.');
    } finally {
      setSavingCandidate(false);
    }
  };

  const banOrUnban = async () => {
    if (!activeCandidate?.id) return;
    setSavingCandidate(true);
    setCandidateError('');
    try {
      const isBanned = (activeCandidate as any).banned === true;
      if (isBanned) {
        await updateDoc(doc(db, 'users', activeCandidate.id), {
          banned: false,
          banReason: '',
          unbannedAt: serverTimestamp(),
          unbannedBy: 'chairman',
          updatedAt: serverTimestamp(),
        } as any);
      } else {
        await updateDoc(doc(db, 'users', activeCandidate.id), {
          banned: true,
          banReason: banReason.trim(),
          bannedAt: serverTimestamp(),
          bannedBy: 'chairman',
          updatedAt: serverTimestamp(),
        } as any);
      }
      setBanConfirmOpen(false);
    } catch (e: any) {
      setCandidateError(e?.message || 'Failed to update ban status.');
    } finally {
      setSavingCandidate(false);
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
      <html><head><title>Candidate Directory</title>
      <meta charset="utf-8" />
      <style>body{font-family:system-ui,Segoe UI,Arial;padding:20px} h1{margin:0 0 14px} table{width:100%;border-collapse:collapse;font-size:12px}</style>
      </head><body>
        <h1>Candidate Directory</h1>
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

  const downloadJson = (c: UserProfile) => {
    downloadTextFile(`${c.candidateIndex || c.id}.json`, JSON.stringify(c, null, 2));
  };

  const printCandidate = (c: UserProfile) => {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>${escapeCsvCell(c.fullName)}</title><meta charset="utf-8" />
      <style>body{font-family:system-ui,Segoe UI,Arial;padding:20px} h1{margin:0 0 14px}</style>
      </head><body>
        <h1>${escapeCsvCell(c.fullName || '')}</h1>
        <div style="color:#64748b;font-size:12px;margin-bottom:14px;">${escapeCsvCell(c.candidateIndex || '')} • ${escapeCsvCell(c.phoneNumber || '')}</div>
        <pre style="white-space:pre-wrap;font-size:12px;background:#f8fafc;border:1px solid #e5e7eb;padding:12px;border-radius:12px;">${escapeCsvCell(JSON.stringify(c, null, 2))}</pre>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  const openFile = async (label: string, url?: string, refObj?: any) => {
    setCandidateError('');
    try {
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (refObj) {
        const signed = await getSignedDownloadUrl(refObj);
        window.open(signed, '_blank', 'noopener,noreferrer');
        return;
      }
      setCandidateError(`${label} is not available.`);
    } catch (e: any) {
      setCandidateError(e?.message || `Failed to open ${label}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">Candidate Directory</h1>
            <p className="text-sm text-muted font-medium">Candidate database with quick actions.</p>
          </div>
          <input className="input-field w-80" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/index/occupation…" />
        </div>
      </div>

      <div className="premium-card">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-3 flex-wrap">
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
            <select className="input-field py-2 w-40" value={ageBand} onChange={(e) => setAgeBand(e.target.value as any)}>
              <option value="all">All Ages</option>
              <option value="18-24">18–24</option>
              <option value="25-34">25–34</option>
              <option value="35-44">35–44</option>
              <option value="45+">45+</option>
            </select>
            <select className="input-field py-2 w-72" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
              <option value="all">All Occupations</option>
              {occupationOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted font-bold uppercase tracking-widest">{filtered.length} results</div>
            <button type="button" onClick={printList} disabled={filtered.length === 0} className="btn-outline py-2 px-3 text-xs font-black uppercase tracking-widest disabled:opacity-50">
              <Printer className="w-4 h-4 mr-2" /> Print
            </button>
            <button type="button" onClick={downloadCsv} disabled={filtered.length === 0} className="btn-outline py-2 px-3 text-xs font-black uppercase tracking-widest disabled:opacity-50">
              <Download className="w-4 h-4 mr-2" /> Download
            </button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-muted font-medium">Loading candidates…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted italic">No candidates found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-sky/50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-28 whitespace-nowrap">Index</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] min-w-[240px]">Candidate</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-44 leading-tight whitespace-nowrap">
                      <span className="block">District</span>
                      <span className="block opacity-70">Ward</span>
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden xl:table-cell w-28 whitespace-nowrap">DOB</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden xl:table-cell w-44 whitespace-nowrap">Education</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-44 whitespace-nowrap">Occupation</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden 2xl:table-cell whitespace-nowrap">Address</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] text-right w-60 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky">
                  {filtered.slice(0, 500).map((c) => (
                    <tr key={c.id} className="hover:bg-sky/20 transition-colors">
                      <td className="px-4 py-4 text-[11px] font-black text-navy align-top">{c.candidateIndex || '-'}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-sky border border-border overflow-hidden flex items-center justify-center">
                            {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-primary">C</span>}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-navy truncate">{c.fullName}</div>
                            <div className="text-[11px] text-muted font-medium truncate">{c.phoneNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium align-top leading-tight">
                        <div className="font-bold text-navy truncate">{c.district || '-'}</div>
                        <div className="truncate">{c.ward || '-'}</div>
                      </td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium hidden xl:table-cell align-top whitespace-nowrap">{c.dob || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium hidden xl:table-cell align-top truncate">{c.education || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium align-top truncate">{c.occupation || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium hidden 2xl:table-cell align-top truncate">{c.address || '-'}</td>
                      <td className="px-4 py-4 text-right align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" className="btn-outline p-2 rounded-xl border-white/50 bg-white/30" onClick={() => openPreview(c)} title="Preview">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button type="button" className="btn-outline p-2 rounded-xl border-white/50 bg-white/30" onClick={() => openEdit(c)} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" className="btn-outline p-2 rounded-xl border-white/50 bg-white/30" onClick={() => printCandidate(c)} title="Print">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button type="button" className="btn-outline p-2 rounded-xl border-white/50 bg-white/30" onClick={() => downloadJson(c)} title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                          <button type="button" className="btn-outline p-2 rounded-xl border-danger/20 bg-danger/10 text-danger hover:bg-danger/15" onClick={() => openDelete(c)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className={[
                              'btn-outline p-2 rounded-xl border-white/50 bg-white/30',
                              (c as any).banned ? 'text-emerald hover:bg-emerald/10 border-emerald/15' : 'text-danger hover:bg-danger/10 border-danger/15',
                            ].join(' ')}
                            onClick={() => openBan(c)}
                            title={(c as any).banned ? 'Unban candidate' : 'Ban candidate'}
                          >
                            <Ban className="w-4 h-4" />
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

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="xl"
        title={`Candidate Preview — ${activeCandidate?.fullName || ''}`}
        footer={
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" className="btn-outline justify-center py-3" onClick={() => setPreviewOpen(false)}>
              Close
            </button>
            {activeCandidate ? (
              <>
                <button type="button" className="btn-outline justify-center py-3" onClick={() => downloadJson(activeCandidate)}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </button>
                <button type="button" className="btn-outline justify-center py-3" onClick={() => printCandidate(activeCandidate)}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </button>
                <button type="button" className="btn-primary justify-center py-3" onClick={() => openEdit(activeCandidate)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </button>
              </>
            ) : null}
          </div>
        }
      >
        {candidateError ? (
          <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-bold text-danger">{candidateError}</div>
        ) : null}

        {activeCandidate ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="premium-card">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sky border border-border overflow-hidden flex items-center justify-center">
                  {activeCandidate.photoUrl ? (
                    <img src={activeCandidate.photoUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-lg font-black text-primary">C</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-navy truncate">{activeCandidate.fullName}</div>
                  <div className="text-sm text-muted font-medium truncate">{activeCandidate.phoneNumber}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Index', activeCandidate.candidateIndex],
                  ['District', activeCandidate.district],
                  ['Ward', activeCandidate.ward],
                  ['DOB', activeCandidate.dob],
                  ['Education', activeCandidate.education],
                  ['Occupation', activeCandidate.occupation],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted">{k}</div>
                    <div className="mt-1 text-sm font-bold text-navy">{v || '-'}</div>
                  </div>
                ))}
                <div className="col-span-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Address</div>
                  <div className="mt-1 text-sm font-bold text-navy">{activeCandidate.address || '-'}</div>
                </div>
              </div>
            </div>

            <div className="premium-card lg:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Files</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={() => openFile('CV', activeCandidate.cvUrl, (activeCandidate as any).cvRef)} disabled={!activeCandidate.cvUrl && !(activeCandidate as any).cvRef}>
                  Open CV
                </button>
                <button
                  type="button"
                  className="btn-outline py-2 px-3 text-xs"
                  onClick={() => openFile('Documents', (activeCandidate as any).documentsUrl, (activeCandidate as any).documentsRef)}
                  disabled={!(activeCandidate as any).documentsUrl && !(activeCandidate as any).documentsRef}
                >
                  Open Documents
                </button>
                <button
                  type="button"
                  className="btn-outline py-2 px-3 text-xs"
                  onClick={() => openFile('Profile photo', activeCandidate.photoUrl, (activeCandidate as any).photoRef)}
                  disabled={!activeCandidate.photoUrl && !(activeCandidate as any).photoRef}
                >
                  Open Photo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted italic">No candidate selected.</div>
        )}
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Candidate — ${activeCandidate?.fullName || ''}`}
        footer={
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" className="btn-outline justify-center py-3" onClick={() => setEditOpen(false)} disabled={savingCandidate}>
              Cancel
            </button>
            <button type="button" className="btn-primary justify-center py-3" onClick={saveEdit} disabled={savingCandidate || !editForm.fullName.trim()}>
              {savingCandidate ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        }
      >
        {candidateError ? (
          <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-bold text-danger">{candidateError}</div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { k: 'fullName', label: 'Full name', type: 'text' },
            { k: 'phoneNumber', label: 'Phone number', type: 'text' },
            { k: 'contactEmail', label: 'Email', type: 'email' },
            { k: 'dob', label: 'DOB', type: 'date' },
            { k: 'education', label: 'Education', type: 'text' },
            { k: 'occupation', label: 'Occupation', type: 'text' },
            { k: 'address', label: 'Address', type: 'text' },
          ].map((f) => (
            <div key={f.k} className={f.k === 'address' ? 'md:col-span-2' : ''}>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">{f.label}</div>
              <input className="input-field" type={f.type as any} value={(editForm as any)[f.k]} onChange={(e) => setEditForm((p) => ({ ...p, [f.k]: e.target.value }))} />
            </div>
          ))}

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">District</div>
            <select className="input-field py-2" value={editForm.district} onChange={(e) => setEditForm((p) => ({ ...p, district: e.target.value, ward: '' }))}>
              <option value="">Select district</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Ward</div>
            <select className="input-field py-2" value={editForm.ward} onChange={(e) => setEditForm((p) => ({ ...p, ward: e.target.value }))} disabled={!editForm.district}>
              <option value="">Select ward</option>
              {((editForm.district ? WARDS[editForm.district as any] : []) || []).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Confirm delete candidate"
        description="This will archive the candidate (recommended). Demo records can be deleted permanently."
        confirmText="Delete"
        loading={savingCandidate}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={archiveOrDelete}
      />

      <Modal
        open={banConfirmOpen}
        onClose={() => setBanConfirmOpen(false)}
        title={(activeCandidate as any)?.banned ? 'Unban candidate' : 'Ban candidate'}
        footer={
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" className="btn-outline justify-center py-3" onClick={() => setBanConfirmOpen(false)} disabled={savingCandidate}>
              Cancel
            </button>
            <button
              type="button"
              className={(activeCandidate as any)?.banned ? 'btn-primary justify-center py-3' : 'btn-primary justify-center py-3 bg-danger hover:bg-danger/90'}
              onClick={banOrUnban}
              disabled={savingCandidate}
            >
              {(activeCandidate as any)?.banned ? 'Unban' : 'Ban'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-muted font-medium">
            {(activeCandidate as any)?.banned ? 'This will restore access for this candidate.' : 'This will block this candidate from accessing the portal.'}
          </div>
          {!(activeCandidate as any)?.banned ? (
            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Reason (optional)</label>
              <textarea className="glass-input min-h-[100px]" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Add a reason for audit trail…" />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

