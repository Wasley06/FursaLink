import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';

export default function ControllerSettingsPage() {
  const { profile } = useAuth();
  const initial = useMemo(
    () => ({
      fullName: profile?.fullName || '',
      phoneNumber: profile?.phoneNumber || '',
      district: profile?.district || '',
    }),
    [profile],
  );
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => setForm(initial), [initial]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.id), { ...form, updatedAt: serverTimestamp() } as any);
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
            <h1 className="text-2xl font-extrabold text-navy">Settings</h1>
            <p className="text-sm text-muted font-medium">Update controller profile details.</p>
          </div>
        </div>
      </div>

      <div className="premium-card space-y-4">
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
        </div>
        <button disabled={saving} onClick={save} className="btn-primary w-full py-3">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

