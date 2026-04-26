import React, { useMemo, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Camera, KeyRound, Loader2, User } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { uploadUserFile } from '../../lib/uploads';

export default function ProfileSettingsPage({ title }: { title: string }) {
  const { profile } = useAuth();

  const initial = useMemo(
    () => ({
      fullName: profile?.fullName || '',
      photoUrl: profile?.photoUrl || '',
    }),
    [profile],
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  React.useEffect(() => setForm(initial), [initial]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      await updateDoc(doc(db, 'users', profile.id), {
        fullName: form.fullName,
        photoUrl: form.photoUrl || '',
        updatedAt: serverTimestamp(),
      } as any);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: form.fullName, photoURL: form.photoUrl || '' });
      }

      setInfo('Profile updated.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async (file: File | null) => {
    if (!profile || !file) return;
    setSaving(true);
    setError('');
    setInfo('');
    setUploadPct(0);
    try {
      const up = await uploadUserFile({
        uid: profile.id,
        file,
        kind: 'profile',
        nameHint: 'profile-photo',
        onProgress: setUploadPct,
      });

      setForm((p) => ({ ...p, photoUrl: up.url }));

      await updateDoc(doc(db, 'users', profile.id), {
        photoUrl: up.url,
        updatedAt: serverTimestamp(),
      } as any);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: up.url });
      }

      setInfo('Photo uploaded.');
    } catch (e: any) {
      setError(e?.message || 'Failed to upload photo.');
    } finally {
      setSaving(false);
      setUploadPct(0);
    }
  };

  const changePassword = async () => {
    setSaving(true);
    setError('');
    setInfo('');
    try {
      if (!auth.currentUser?.email) throw new Error('Missing auth email.');
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setInfo('Password updated.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl relative">
      <div
        className="hidden lg:block pointer-events-none absolute -right-10 top-24 w-[340px] h-[340px] opacity-[0.06]"
        style={{
          backgroundImage: 'var(--watermark-image)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
        }}
      />

      <div className="premium-card">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted">Settings</div>
        <h1 className="text-2xl font-extrabold text-navy mt-2">{title}</h1>
        <p className="text-sm text-muted font-medium mt-2">Update your profile details and security.</p>
      </div>

      {(error || info) && (
        <div className="premium-card">
          {error && <div className="text-sm text-danger font-bold">{error}</div>}
          {info && <div className="text-sm text-emerald font-bold">{info}</div>}
        </div>
      )}

      <div className="premium-card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-sky border border-border flex items-center justify-center overflow-hidden">
            {form.photoUrl ? <img src={form.photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-primary" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-navy">Profile</div>
            <div className="text-xs text-muted font-medium">Name and photo are shown across the dashboards.</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Full Name</label>
            <input className="input-field" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Profile Photo</label>
            <label className="btn-outline w-full py-3 cursor-pointer gap-2">
              <Camera className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Upload Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickPhoto(e.target.files?.[0] || null)} />
            </label>
            {saving && uploadPct > 0 && <div className="mt-2 text-xs text-muted font-medium">Uploading: {uploadPct}%</div>}
          </div>
        </div>

        <button disabled={saving} onClick={saveProfile} className="btn-primary w-full py-3">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile'}
        </button>
      </div>

      <div className="premium-card space-y-4">
        <div className="text-sm font-extrabold text-navy">Password</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Current Password</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="password" className="input-field pl-11" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="password" className="input-field pl-11" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
        </div>
        <button disabled={saving || !currentPassword || newPassword.length < 8} onClick={changePassword} className="btn-outline w-full py-3">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Change Password'}
        </button>
        <div className="text-xs text-muted font-medium">Password change may require recent sign-in.</div>
      </div>
    </div>
  );
}

