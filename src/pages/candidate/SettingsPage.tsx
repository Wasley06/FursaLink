import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { FileText, ImageUp, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DISTRICTS, WARDS, type District } from '../../constants/locations';
import { db } from '../../lib/firebase';
import { buildCandidateIndex } from '../../lib/candidateIndex';
import { getSignedDownloadUrl, uploadUserFile } from '../../lib/uploads';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [error, setError] = useState('');
  const [uploadLabel, setUploadLabel] = useState<string>('');
  const [cvRef, setCvRef] = useState<any>(profile?.cvRef);
  const [documentsRef, setDocumentsRef] = useState<any>(profile?.documentsRef);

  const initial = useMemo(
    () => ({
      fullName: profile?.fullName || '',
      phoneNumber: profile?.phoneNumber || '',
      district: (profile?.district as District | undefined) || '',
      ward: profile?.ward || '',
      dob: profile?.dob || '',
      address: profile?.address || '',
      occupation: profile?.occupation || '',
      education: profile?.education || '',
      skills: profile?.skills || '',
      photoUrl: profile?.photoUrl || '',
    }),
    [profile],
  );

  const [form, setForm] = useState(initial);

  React.useEffect(() => setForm(initial), [initial]);
  React.useEffect(() => setCvRef(profile?.cvRef), [profile?.cvRef]);
  React.useEffect(() => setDocumentsRef(profile?.documentsRef), [profile?.documentsRef]);

  const wards = form.district ? WARDS[form.district] || [] : [];

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      const fields = Object.values(form).filter((v) => String(v || '').trim().length > 0).length;
      const total = Object.keys(form).length;
      const progress = Math.min(100, Math.round((fields / total) * 100));
      await updateDoc(doc(db, 'users', profile.id), {
        ...form,
        profileProgress: progress,
        candidateIndex: buildCandidateIndex({ district: form.district, ward: form.ward, uid: profile.id }),
        updatedAt: serverTimestamp(),
      } as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File | null) => {
    if (!profile || !file) return;
    setSaving(true);
    setError('');
    setUploadPct(0);
    setUploadLabel('Uploading photo…');
    const previewUrl = URL.createObjectURL(file);
    setForm((p) => ({ ...p, photoUrl: previewUrl }));
    try {
      const up = await uploadUserFile({
        uid: profile.id,
        file,
        kind: 'profile',
        nameHint: 'candidate-photo',
        onProgress: setUploadPct,
      });
      setForm((p) => ({ ...p, photoUrl: up.url || '' }));
      await updateDoc(doc(db, 'users', profile.id), { photoUrl: up.url || '', photoRef: up.ref, updatedAt: serverTimestamp() } as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload photo.');
      setForm((p) => ({ ...p, photoUrl: profile?.photoUrl || '' }));
    } finally {
      setSaving(false);
      setUploadPct(0);
      setUploadLabel('');
      try { URL.revokeObjectURL(previewUrl); } catch {}
    }
  };

  const uploadCv = async (file: File | null) => {
    if (!profile || !file) return;
    setSaving(true);
    setError('');
    setUploadPct(0);
    setUploadLabel('Uploading CV…');
    try {
      const up = await uploadUserFile({ uid: profile.id, file, kind: 'cv', nameHint: 'cv', onProgress: setUploadPct });
      setCvRef(up.ref);
      await updateDoc(doc(db, 'users', profile.id), { cvRef: up.ref, cvUrl: up.url || '', updatedAt: serverTimestamp() } as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload CV.');
    } finally {
      setSaving(false);
      setUploadPct(0);
      setUploadLabel('');
    }
  };

  const uploadDoc = async (file: File | null) => {
    if (!profile || !file) return;
    setSaving(true);
    setError('');
    setUploadPct(0);
    setUploadLabel('Uploading document…');
    try {
      const up = await uploadUserFile({ uid: profile.id, file, kind: 'document', nameHint: file.name, onProgress: setUploadPct });
      // Minimal: store latest extra document ref. (Can be extended to an array.)
      setDocumentsRef(up.ref);
      await updateDoc(doc(db, 'users', profile.id), { documentsRef: up.ref, documentsUrl: up.url || '', updatedAt: serverTimestamp() } as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload document.');
    } finally {
      setSaving(false);
      setUploadPct(0);
      setUploadLabel('');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl relative">
      <div
        className="hidden lg:block pointer-events-none absolute -right-10 top-20 w-[340px] h-[340px] opacity-[0.06]"
        style={{
          backgroundImage: 'var(--watermark-image)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
        }}
      />

      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Profile Settings</h1>
            <p className="text-sm text-muted font-medium">Update your candidate profile and preferences.</p>
          </div>
        </div>
        {(saving && uploadPct > 0) || uploadLabel ? (
          <div className="mt-4 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-widest text-muted">{uploadLabel || 'Uploading…'}</div>
              <div className="text-xs font-extrabold text-navy">{uploadPct}%</div>
            </div>
            <div className="mt-3 h-1.5 w-full bg-sky rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="premium-card space-y-4">
        {error && <div className="text-sm text-danger font-bold">{error}</div>}
        {saving && uploadPct > 0 && <div className="text-xs text-muted font-medium">Uploading: {uploadPct}%</div>}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Full Name</label>
            <input className="input-field" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Phone</label>
            <input className="input-field" value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
          </div>

          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">District</label>
            <select className="input-field" value={form.district} onChange={(e) => setForm((p) => ({ ...p, district: e.target.value as District, ward: '' }))}>
              <option value="">Select district</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Ward</label>
            <select className="input-field" value={form.ward} onChange={(e) => setForm((p) => ({ ...p, ward: e.target.value }))} disabled={!form.district}>
              <option value="">Select ward</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Date of Birth</label>
            <input type="date" className="input-field" value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Profile Photo</label>
            <label className="btn-outline w-full py-3 cursor-pointer gap-2">
              <ImageUp className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Upload Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Education</label>
            <input className="input-field" value={form.education} onChange={(e) => setForm((p) => ({ ...p, education: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Desired Occupation</label>
            <input className="input-field" value={form.occupation} onChange={(e) => setForm((p) => ({ ...p, occupation: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Address</label>
          <input className="input-field" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Street / Area" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Skills</label>
          <textarea
            rows={4}
            className="input-field py-3"
            value={form.skills}
            onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
            placeholder="e.g., Excel, Nursing, Customer Service..."
          />
        </div>

        <button disabled={saving} onClick={save} className="btn-primary w-full py-3">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="premium-card space-y-4">
        <div className="text-sm font-extrabold text-navy">Documents</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">CV (PDF)</label>
            <label className="btn-outline w-full py-3 cursor-pointer gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Upload CV</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => uploadCv(e.target.files?.[0] || null)} />
            </label>
            {!!cvRef && (
              <button
                type="button"
                className="btn-outline w-full py-3 mt-2"
                disabled={saving}
                onClick={async () => {
                  try {
                    const url = await getSignedDownloadUrl(cvRef);
                    window.open(url, '_blank', 'noopener,noreferrer');
                  } catch (e: any) {
                    setError(e?.message || 'Failed to open CV.');
                  }
                }}
              >
                Open CV
              </button>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Other Document</label>
            <label className="btn-outline w-full py-3 cursor-pointer gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Upload Document</span>
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => uploadDoc(e.target.files?.[0] || null)} />
            </label>
            {!!documentsRef && (
              <button
                type="button"
                className="btn-outline w-full py-3 mt-2"
                disabled={saving}
                onClick={async () => {
                  try {
                    const url = await getSignedDownloadUrl(documentsRef);
                    window.open(url, '_blank', 'noopener,noreferrer');
                  } catch (e: any) {
                    setError(e?.message || 'Failed to open document.');
                  }
                }}
              >
                Open Document
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-muted font-medium">Files are stored securely and linked to your account.</div>
      </div>
    </div>
  );
}
