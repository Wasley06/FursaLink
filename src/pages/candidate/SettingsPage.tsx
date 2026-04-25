import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const initial = useMemo(
    () => ({
      fullName: profile?.fullName || '',
      phoneNumber: profile?.phoneNumber || '',
      district: profile?.district || '',
      ward: profile?.ward || '',
      occupation: profile?.occupation || '',
      education: profile?.education || '',
      skills: profile?.skills || '',
    }),
    [profile],
  );

  const [form, setForm] = useState(initial);

  React.useEffect(() => {
    setForm(initial);
  }, [initial]);

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
        updatedAt: serverTimestamp(),
      } as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
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
      </div>

      <div className="premium-card space-y-4">
        {error && <div className="text-sm text-danger font-bold">{error}</div>}
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
            <input className="input-field" value={form.district} onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Ward</label>
            <input className="input-field" value={form.ward} onChange={(e) => setForm((p) => ({ ...p, ward: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Occupation</label>
            <input className="input-field" value={form.occupation} onChange={(e) => setForm((p) => ({ ...p, occupation: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Education</label>
            <input className="input-field" value={form.education} onChange={(e) => setForm((p) => ({ ...p, education: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Skills</label>
          <textarea
            rows={4}
            className="input-field py-3"
            value={form.skills}
            onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
            placeholder="e.g., Excel, Nursing, Customer Service…"
          />
        </div>
        <button disabled={saving} onClick={save} className="btn-primary w-full py-3">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

