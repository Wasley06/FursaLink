import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Ban, Download, Eye, Pencil, Printer, Trash2, Users } from 'lucide-react';
import { DISTRICTS, WARDS, type District } from '../../constants/locations';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getSignedDownloadUrl } from '../../lib/uploads';
import { getLiveAppUrl } from '../../lib/liveAppUrl';
import { addFursaLinkHeader, addKeyValueGrid, addSectionTitle, addTable, createBrandedPdfDoc } from '../../lib/pdf';

function escapeCsvCell(v: any) {
  const s = String(v ?? '');
  const needs = /[",\n]/.test(s);
  const out = s.replace(/"/g, '""');
  return needs ? `"${out}"` : out;
}

export default function ChairmanCandidatesPage() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<District | 'all'>('all');
  const [ward, setWard] = useState<string>('all');
  const [q, setQ] = useState('');
  const [occupation, setOccupation] = useState<string>('all');
  const [ageBand, setAgeBand] = useState<'all' | '18-24' | '25-30' | '31-35'>('all');

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
        if (ageBand === '25-30' && (age < 25 || age > 30)) return false;
        if (ageBand === '31-35' && (age < 31 || age > 35)) return false;
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

  const printList = () => {
    exportListPdf();
    return;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) return;
    const brandLogo = `${getLiveAppUrl()}/brand/logo.png`;
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
      <style>
        body{font-family:system-ui,Segoe UI,Arial;padding:20px}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:16px}
        .brand img{width:40px;height:40px;object-fit:contain;border-radius:12px;border:1px solid #e5e7eb;background:#fff}
        .brand .t{font-weight:900;letter-spacing:.02em;color:#083B66}
        .sub{color:#64748b;font-size:12px;margin-top:2px}
        h1{margin:0 0 10px}
        table{width:100%;border-collapse:collapse;font-size:12px}
      </style>
      </head><body>
        <div class="brand">
          <img src="${brandLogo}" alt="FursaLink" />
          <div>
            <div class="t">FursaLink</div>
            <div class="sub">Candidate Profiles Export</div>
          </div>
        </div>
        <h1>Candidate Profiles</h1>
        <div style="margin-bottom:12px;color:#64748b;font-size:12px;">District: ${escapeCsvCell(district)} • Ward: ${escapeCsvCell(ward)} • Total: ${filtered.length}</div>
        <table>
          <thead><tr style="text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:#0b3d91;">
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Index</th>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Profile</th>
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

  const exportListPdf = async () => {
    setCandidateError('');
    try {
      const doc = createBrandedPdfDoc({ title: 'Candidate Directory' });
      let y = await addFursaLinkHeader(doc, { title: 'Candidate Directory', subtitle: 'Candidate profiles export' });
      y = addSectionTitle(doc, { text: 'Filters', y });
      y = addKeyValueGrid(doc, {
        y,
        items: [
          { label: 'District', value: district === 'all' ? 'All' : String(district) },
          { label: 'Ward', value: ward === 'all' ? 'All' : String(ward) },
          { label: 'Total', value: String(filtered.length) },
        ],
      });
      y = addSectionTitle(doc, { text: 'Profiles', y: y + 6 });
      const rows = filtered.slice(0, 800).map((c, idx) => [
        `${idx + 1}.`,
        c.candidateIndex || '',
        c.fullName || '',
        c.phoneNumber || '',
        c.district || '',
        c.ward || '',
        c.occupation || '',
      ]);
      addTable(doc, {
        startY: y,
        head: [['#', 'Reference', 'Name', 'Phone', 'District', 'Ward', 'Occupation']],
        body: rows,
      });
      doc.save(`fursalink_candidate_directory_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      setCandidateError(e?.message || 'Failed to generate PDF.');
    }
  };

  const printCandidate = (c: UserProfile) => {
    exportProfilePdf(c);
    return;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) return;
    const brandLogo = `${getLiveAppUrl()}/brand/logo.png`;
    const photo = String(c.photoUrl || '').trim();
    w.document.write(`
      <html><head><title>${escapeCsvCell(c.fullName)} - Profile</title><meta charset="utf-8" />
      <style>
        :root{--navy:#083B66;--muted:#64748b;--border:#e2e8f0;--card:#f8fafc;--chip:#fff7e6;}
        body{font-family:system-ui,Segoe UI,Arial;padding:22px;color:#0f172a}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}
        .brand img{width:40px;height:40px;object-fit:contain;border-radius:12px;border:1px solid var(--border);background:#fff}
        .brand .t{font-weight:900;letter-spacing:.02em;color:var(--navy)}
        .sub{color:var(--muted);font-size:12px;margin-top:2px}
        .top{display:flex;gap:16px;align-items:flex-start;margin:12px 0 18px}
        .photo{width:110px;height:110px;border-radius:18px;border:3px solid #fbbf24;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .photo img{width:100%;height:100%;object-fit:cover}
        h1{margin:0;font-size:28px;letter-spacing:.01em;color:#0b2b4a}
        .meta{color:var(--muted);font-size:12px;margin-top:6px}
        .tag{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:var(--chip);border:1px solid #fde68a;color:#92400e;font-weight:900;font-size:10px;letter-spacing:.14em;text-transform:uppercase}
        .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
        .card{border:1px solid var(--border);border-radius:14px;background:var(--card);padding:10px 12px}
        .l{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
        .v{margin-top:6px;font-weight:900;color:#0f172a;font-size:13px}
        .v.m{font-weight:700;color:#0f172a}
        .foot{margin-top:14px;color:var(--muted);font-size:11px}
      </style>
      </head><body>
        <div class="brand">
          <img src="${brandLogo}" alt="FursaLink" />
          <div>
            <div class="t">FursaLink</div>
            <div class="meta" style="margin:2px 0 0;">Candidate Profile Export</div>
          </div>
        </div>
        <div class="top">
          <div class="photo">
            ${photo ? `<img src="${escapeCsvCell(photo)}" alt="" />` : `<div style="font-weight:900;color:var(--navy);">No photo</div>`}
          </div>
          <div style="flex:1;min-width:0;">
            <div class="tag">PROFILE</div>
            <h1>${escapeCsvCell(c.fullName || '')}</h1>
            <div class="meta">${escapeCsvCell(c.candidateIndex || '')} • ${escapeCsvCell(c.occupation || '')}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card"><div class="l">Phone</div><div class="v">${escapeCsvCell(c.phoneNumber || '-')}</div></div>
          <div class="card"><div class="l">Email</div><div class="v m">${escapeCsvCell((c as any).contactEmail || (c as any).email || '-')}</div></div>
          <div class="card"><div class="l">District / Ward</div><div class="v">${escapeCsvCell(c.district || '-')} / ${escapeCsvCell(c.ward || '-')}</div></div>
          <div class="card"><div class="l">DOB</div><div class="v">${escapeCsvCell(c.dob || '-')}</div></div>
          <div class="card"><div class="l">Education</div><div class="v">${escapeCsvCell(c.education || '-')}</div></div>
          <div class="card"><div class="l">Address</div><div class="v m">${escapeCsvCell(c.address || '-')}</div></div>
        </div>

        <div class="foot">Generated by FursaLink Zanzibar • ${new Date().toLocaleString()}</div>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  const exportProfilePdf = async (c: UserProfile) => {
    setCandidateError('');
    try {
      const doc = createBrandedPdfDoc({ title: `${c.fullName || 'Candidate'} - Profile` });
      let y = await addFursaLinkHeader(doc, { title: 'Candidate Profile', subtitle: 'FursaLink branded export' });
      y = addSectionTitle(doc, { text: 'Summary', y });
      y = addKeyValueGrid(doc, {
        y,
        items: [
          { label: 'Name', value: String(c.fullName || '-') },
          { label: 'Reference', value: String(c.candidateIndex || '-') },
          { label: 'Occupation', value: String(c.occupation || '-') },
          { label: 'Phone', value: String(c.phoneNumber || '-') },
          { label: 'District', value: String(c.district || '-') },
          { label: 'Ward', value: String(c.ward || '-') },
          { label: 'DOB', value: String(c.dob || '-') },
          { label: 'Education', value: String(c.education || '-') },
          { label: 'Address', value: String(c.address || '-') },
        ],
      });

      const files = [
        { name: 'Profile Photo', ok: !!(c.photoUrl || (c as any).photoRef) },
        { name: 'CV', ok: !!(c.cvUrl || (c as any).cvRef) },
        { name: 'Documents', ok: !!(c.documentsUrl || (c as any).documentsRef) },
        { name: 'ID', ok: !!((c as any).idUrl || (c as any).idRef) },
        { name: 'Certificates', ok: !!((c as any).certificatesUrl || (c as any).certificatesRef) },
        { name: 'TIN', ok: !!((c as any).tinUrl || (c as any).tinRef) },
        { name: 'Sheha Letter', ok: !!((c as any).shehaLetterUrl || (c as any).shehaLetterRef) },
      ];
      y = addSectionTitle(doc, { text: 'Documents', y: y + 6 });
      addTable(doc, { startY: y, head: [['Document', 'Available']], body: files.map((f) => [f.name, f.ok ? 'Yes' : 'No']) });

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
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">Candidate Directory</h1>
            <p className="text-sm text-muted font-medium">Candidate profiles database with quick actions.</p>
          </div>
          <input
            className="input-field w-80"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name/occupation/district/ward/age/reference…"
          />
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
              <option value="25-30">25–30</option>
              <option value="31-35">31–35</option>
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
            <button type="button" onClick={printList} disabled={filtered.length === 0} className="btn-outline py-2 px-3 text-xs font-black uppercase tracking-widest disabled:opacity-50" title="Export filtered list as PDF (print)">
              <Download className="w-4 h-4 mr-2" /> Export PDF
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
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-12 whitespace-nowrap">#</th>
                    <th className="px-4 py-3 text-[10px] font-black text-primary uppercase tracking-[0.14em] w-32 whitespace-nowrap">Reference</th>
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
                  {filtered.slice(0, 500).map((c, idx) => (
                    <tr key={c.id} className="hover:bg-sky/20 transition-colors">
                      <td className="px-4 py-4 text-[11px] font-black text-muted align-top whitespace-nowrap">{idx + 1}.</td>
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
                          <button type="button" className="btn-outline p-2 rounded-xl border-white/50 bg-white/30" onClick={() => printCandidate(c)} title="Export PDF">
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
                <button type="button" className="btn-outline justify-center py-3" onClick={() => printCandidate(activeCandidate)}>
                  <Download className="w-4 h-4 mr-2" /> Export PDF
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
