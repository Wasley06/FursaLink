import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Ban, Download, Eye, Pencil, Printer, Trash2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { WARDS } from '../../constants/locations';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getSignedDownloadUrl } from '../../lib/uploads';
import { addFursaLinkHeader, addKeyValueGrid, addSectionTitle, addTable, createBrandedPdfDoc } from '../../lib/pdf';

export default function CandidatesPage() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [ward, setWard] = useState<string>('all');
  const [q, setQ] = useState('');

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
    ward: '',
    dob: '',
    education: '',
    occupation: '',
    address: '',
  });

  useEffect(() => {
    if (!profile?.district) return;
    setLoading(true);
    const qy = query(
      collection(db, 'users'),
      where('role', '==', 'candidate'),
      where('district', '==', profile.district),
      limit(800),
    );
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setCandidates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [profile?.district]);

  const wardOptions = useMemo(() => {
    if (!profile?.district) return [];
    return WARDS[profile.district as any] || [];
  }, [profile?.district]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return candidates.filter((c) => {
      if ((c as any).archived === true) return false;
      if (ward !== 'all' && (c.ward || '') !== ward) return false;
      if (!needle) return true;
      return (
        (c.fullName || '').toLowerCase().includes(needle) ||
        (c.phoneNumber || '').toLowerCase().includes(needle) ||
        (c.candidateIndex || '').toLowerCase().includes(needle) ||
        (c.occupation || '').toLowerCase().includes(needle) ||
        (c.ward || '').toLowerCase().includes(needle)
      );
    });
  }, [candidates, q, ward]);

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
          archivedBy: profile?.id || '',
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
          unbannedBy: profile?.id || '',
          updatedAt: serverTimestamp(),
        } as any);
      } else {
        await updateDoc(doc(db, 'users', activeCandidate.id), {
          banned: true,
          banReason: banReason.trim(),
          bannedAt: serverTimestamp(),
          bannedBy: profile?.id || '',
          updatedAt: serverTimestamp(),
        } as any);
      }
      setBanConfirmOpen(false);
      setPreviewOpen(false);
      setEditOpen(false);
    } catch (e: any) {
      setCandidateError(e?.message || 'Failed to update ban status.');
    } finally {
      setSavingCandidate(false);
    }
  };

  const downloadJson = (c: UserProfile) => {
    const payload = { ...c };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(c.candidateIndex || c.id || 'candidate').toString().replace(/[^a-z0-9_-]/gi, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const cols = ['candidateIndex', 'fullName', 'phoneNumber', 'ward', 'dob', 'education', 'occupation', 'address'];
    const escape = (v: any) => `"${String(v ?? '').replace(/\"/g, '""')}"`;
    const rows = filtered.map((c) => cols.map((k) => escape((c as any)[k])).join(','));
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${profile?.district || 'district'}-${ward === 'all' ? 'all' : ward}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    exportListPdf();
    return;
    const html = `
      <html>
        <head>
          <title>Candidate Directory</title>
          <style>
            body{font-family:Arial,sans-serif;padding:16px}
            h1{margin:0 0 8px 0}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            th,td{border:1px solid #ddd;padding:8px;font-size:12px;vertical-align:top}
            th{background:#f3f4f6;text-transform:uppercase;letter-spacing:.08em;font-size:11px}
          </style>
        </head>
        <body>
          <h1>Candidate Directory</h1>
          <div>District: ${profile?.district || ''} • Ward: ${ward} • Total: ${filtered.length}</div>
          <table>
            <thead>
              <tr>
                <th>Index</th><th>Name</th><th>Phone</th><th>Ward</th><th>Occupation</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .slice(0, 1000)
                .map(
                  (c) =>
                    `<tr><td>${c.candidateIndex || ''}</td><td>${c.fullName || ''}</td><td>${c.phoneNumber || ''}</td><td>${c.ward || ''}</td><td>${c.occupation || ''}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const exportListPdf = async () => {
    setCandidateError('');
    try {
      const doc = createBrandedPdfDoc({ title: 'Candidate Directory' });
      let y = await addFursaLinkHeader(doc, { title: 'Candidate Directory', subtitle: 'Controller export' });
      y = addSectionTitle(doc, { text: 'Filters', y });
      y = addKeyValueGrid(doc, {
        y,
        items: [
          { label: 'District', value: String(profile?.district || '-') },
          { label: 'Ward', value: ward === 'all' ? 'All' : String(ward) },
          { label: 'Total', value: String(filtered.length) },
        ],
      });
      y = addSectionTitle(doc, { text: 'Profiles', y: y + 6 });
      addTable(doc, {
        startY: y,
        head: [['#', 'Reference', 'Name', 'Phone', 'Ward', 'Occupation']],
        body: filtered.slice(0, 800).map((c, idx) => [`${idx + 1}.`, c.candidateIndex || '', c.fullName || '', c.phoneNumber || '', c.ward || '', c.occupation || '']),
      });
      doc.save(`fursalink_candidate_directory_${String(profile?.district || 'district')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      setCandidateError(e?.message || 'Failed to generate PDF.');
    }
  };

  const printCandidate = (c: UserProfile) => {
    exportProfilePdf(c);
    return;
    const html = `
      <html>
        <head>
          <title>${c.fullName || 'Candidate'}</title>
          <style>
            body{font-family:Arial,sans-serif;padding:18px}
            h1{margin:0 0 8px 0}
            .meta{color:#374151;font-size:12px;margin-bottom:14px}
            .row{display:flex;gap:14px;margin-top:8px}
            .k{width:160px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
            .v{flex:1;font-size:13px;color:#111827;font-weight:600}
            .card{border:1px solid #e5e7eb;border-radius:12px;padding:14px}
          </style>
        </head>
        <body>
          <h1>${c.fullName || ''}</h1>
          <div class="meta">${c.candidateIndex || ''} • ${c.phoneNumber || ''}</div>
          <div class="card">
            ${[
              ['Ward', c.ward],
              ['DOB', c.dob],
              ['Education', (c as any).education],
              ['Occupation', c.occupation],
              ['Address', (c as any).address],
              ['Email', (c as any).contactEmail || (c as any).email],
            ]
              .map(([k, v]) => `<div class="row"><div class="k">${k}</div><div class="v">${String(v || '—')}</div></div>`)
              .join('')}
          </div>
        </body>
      </html>
    `;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const exportProfilePdf = async (c: UserProfile) => {
    setCandidateError('');
    try {
      const doc = createBrandedPdfDoc({ title: `${c.fullName || 'Candidate'} - Profile` });
      let y = await addFursaLinkHeader(doc, { title: 'Candidate Profile', subtitle: 'Controller export' });
      y = addSectionTitle(doc, { text: 'Summary', y });
      addKeyValueGrid(doc, {
        y,
        items: [
          { label: 'Name', value: String(c.fullName || '-') },
          { label: 'Reference', value: String(c.candidateIndex || '-') },
          { label: 'Occupation', value: String(c.occupation || '-') },
          { label: 'Phone', value: String(c.phoneNumber || '-') },
          { label: 'District', value: String(c.district || '-') },
          { label: 'Ward', value: String(c.ward || '-') },
          { label: 'DOB', value: String(c.dob || '-') },
          { label: 'Education', value: String((c as any).education || '-') },
          { label: 'Address', value: String((c as any).address || '-') },
          { label: 'Email', value: String((c as any).contactEmail || (c as any).email || '-') },
        ],
      });
      const safe = (c.fullName || 'candidate').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) || 'candidate';
      doc.save(`fursalink_${safe}_profile.pdf`);
    } catch (e: any) {
      setCandidateError(e?.message || 'Failed to generate PDF.');
    }
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
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Candidate Directory</h1>
            <p className="text-sm text-muted font-medium">Candidates in {profile?.district}.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading candidates…</div>
        ) : candidates.length === 0 ? (
          <div className="text-sm text-muted italic">No candidates found.</div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex gap-3 flex-wrap">
                <select className="input-field py-2 w-56" value={ward} onChange={(e) => setWard(e.target.value)}>
                  <option value="all">All Wards</option>
                  {wardOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <input className="input-field w-72" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/index/occupation…" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted font-bold uppercase tracking-widest">{filtered.length} results</div>
                <button
                  type="button"
                  onClick={printList}
                  disabled={filtered.length === 0}
                  className="btn-outline py-2 px-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 mr-2" /> Print
                </button>
                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={filtered.length === 0}
                  className="btn-outline py-2 px-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </button>
              </div>
            </div>

            <div className="mt-4 w-full">
              <table className="w-full text-left table-fixed">
                <thead className="bg-sky/50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-24">Index</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em]">Candidate</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-44">Ward</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden xl:table-cell w-28">DOB</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden xl:table-cell w-44">Education</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-44">Occupation</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden 2xl:table-cell">Address</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] hidden 2xl:table-cell">Email</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] text-right w-56">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky">
                  {filtered.map((c) => (
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
                      <td className="px-4 py-4 text-[11px] text-muted font-medium align-top truncate">{c.ward || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium hidden xl:table-cell align-top">{c.dob || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium hidden xl:table-cell align-top truncate">{c.education || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium align-top truncate">{c.occupation || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium hidden 2xl:table-cell align-top truncate">{c.address || '-'}</td>
                      <td className="px-4 py-4 text-[11px] text-muted font-medium hidden 2xl:table-cell align-top truncate">{(c as any).contactEmail || (c as any).email || '-'}</td>
                      <td className="px-4 py-4 text-right align-top">
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs font-black uppercase tracking-widest text-muted">
                            Progress: <span className="text-navy">{c.profileProgress || 0}%</span>
                          </div>
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
                            <button
                              type="button"
                              className="btn-outline p-2 rounded-xl border-danger/20 bg-danger/10 text-danger hover:bg-danger/15"
                              onClick={() => openDelete(c)}
                              title="Delete (archives non-demo candidates)"
                            >
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
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
          <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-bold text-danger">
            {candidateError}
          </div>
        ) : null}

        {activeCandidate ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="premium-card">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-sky border border-border overflow-hidden flex items-center justify-center">
                  {activeCandidate.photoUrl ? (
                    <img src={activeCandidate.photoUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-sm font-black text-primary">C</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-navy truncate">{activeCandidate.fullName || '—'}</div>
                  <div className="text-xs text-muted font-bold uppercase tracking-widest truncate">
                    {activeCandidate.candidateIndex || activeCandidate.id}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Phone</div>
                  <div className="text-xs font-bold text-navy truncate">{activeCandidate.phoneNumber || '—'}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Ward</div>
                  <div className="text-xs font-bold text-navy truncate">{activeCandidate.ward || '—'}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Occupation</div>
                  <div className="text-xs font-bold text-navy truncate">{activeCandidate.occupation || '—'}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">Education</div>
                  <div className="text-xs font-bold text-navy truncate">{(activeCandidate as any).education || '—'}</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="premium-card">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted">Profile Information</div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { k: 'DOB', v: activeCandidate.dob },
                    { k: 'Email', v: (activeCandidate as any).contactEmail || (activeCandidate as any).email },
                    { k: 'Address', v: (activeCandidate as any).address },
                    { k: 'Progress', v: `${activeCandidate.profileProgress || 0}%` },
                  ].map((row) => (
                    <div key={row.k} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted">{row.k}</div>
                      <div className="mt-1 text-sm font-extrabold text-navy truncate">{(row.v as any) || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="premium-card">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted">Attachments</div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    className="btn-outline py-3 justify-center"
                    onClick={() => openFile('CV', (activeCandidate as any).cvUrl, (activeCandidate as any).cvRef)}
                    disabled={!(activeCandidate as any).cvUrl && !(activeCandidate as any).cvRef}
                  >
                    Open CV
                  </button>
                  <button
                    type="button"
                    className="btn-outline py-3 justify-center"
                    onClick={() => openFile('Documents', (activeCandidate as any).documentsUrl, (activeCandidate as any).documentsRef)}
                    disabled={!(activeCandidate as any).documentsUrl && !(activeCandidate as any).documentsRef}
                  >
                    Open Documents
                  </button>
                  <button
                    type="button"
                    className="btn-outline py-3 justify-center"
                    onClick={() => openFile('Profile photo', activeCandidate.photoUrl, (activeCandidate as any).photoRef)}
                    disabled={!activeCandidate.photoUrl && !(activeCandidate as any).photoRef}
                  >
                    Open Photo
                  </button>
                </div>
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
          <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs font-bold text-danger">
            {candidateError}
          </div>
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
              <input
                className="input-field"
                type={f.type as any}
                value={(editForm as any)[f.k]}
                onChange={(e) => setEditForm((p) => ({ ...p, [f.k]: e.target.value }))}
              />
            </div>
          ))}

          <div className="md:col-span-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Ward</div>
            <select className="input-field py-2" value={editForm.ward} onChange={(e) => setEditForm((p) => ({ ...p, ward: e.target.value }))}>
              <option value="">Select ward</option>
              {wardOptions.map((w) => (
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
