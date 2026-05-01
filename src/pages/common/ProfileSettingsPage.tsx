import React, { useEffect, useMemo, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Camera, KeyRound, Loader2, User } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { uploadUserFile } from '../../lib/uploads';

export default function ProfileSettingsPage({ title }: { title: string }) {
  const { profile } = useAuth();

  const initial = useMemo(() => {
    const prefs = (profile as any)?.preferences || {};
    return {
      fullName: profile?.fullName || '',
      photoUrl: profile?.photoUrl || '',
      notifyInApp: prefs.notifyInApp ?? true,
      notifyEmail: prefs.notifyEmail ?? false,
      notifyPush: prefs.notifyPush ?? true,
      themeMode: prefs.themeMode ?? 'auto',
      securityAlerts: prefs.securityAlerts ?? true,
    };
  }, [profile]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [activity, setActivity] = useState<any[]>([]);
  const [activityError, setActivityError] = useState<string>('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  React.useEffect(() => setForm(initial), [initial]);

  useEffect(() => {
    const run = async () => {
      if (!profile?.id) return;
      setActivityError('');
      try {
        const snap = await getDocs(
          query(collection(db, 'auditLogs'), where('actorId', '==', profile.id), orderBy('createdAt', 'desc'), limit(10)),
        );
        setActivity(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e: any) {
        setActivity([]);
        setActivityError(e?.code === 'permission-denied' ? 'Activity logs are restricted by policy.' : 'Failed to load activity logs.');
      }
    };
    run();
  }, [profile?.id]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      await updateDoc(doc(db, 'users', profile.id), {
        fullName: form.fullName,
        photoUrl: form.photoUrl || '',
        preferences: {
          notifyInApp: !!form.notifyInApp,
          notifyEmail: !!form.notifyEmail,
          notifyPush: !!form.notifyPush,
          themeMode: form.themeMode,
          securityAlerts: !!form.securityAlerts,
        },
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
    const previewUrl = URL.createObjectURL(file);
    setForm((p) => ({ ...p, photoUrl: previewUrl }));
    try {
      const up = await uploadUserFile({
        uid: profile.id,
        file,
        kind: 'profile',
        nameHint: 'profile-photo',
        onProgress: setUploadPct,
      });

      setForm((p) => ({ ...p, photoUrl: up.url || '' }));

      await updateDoc(doc(db, 'users', profile.id), {
        photoUrl: up.url || '',
        photoRef: up.ref,
        updatedAt: serverTimestamp(),
      } as any);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: up.url || '' });
      }

      setInfo('Photo uploaded.');
    } catch (e: any) {
      setError(e?.message || 'Failed to upload photo.');
      setForm((p) => ({ ...p, photoUrl: profile?.photoUrl || '' }));
    } finally {
      setSaving(false);
      setUploadPct(0);
      try { URL.revokeObjectURL(previewUrl); } catch {}
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
        <div className="text-sm font-extrabold text-navy">Notification Preferences</div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { key: 'notifyInApp', label: 'In-app alerts' },
            { key: 'notifyPush', label: 'Push notifications' },
            { key: 'notifyEmail', label: 'Email notifications' },
          ].map((it) => (
            <label key={it.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3">
              <div className="text-xs font-black uppercase tracking-widest text-navy">{it.label}</div>
              <input
                type="checkbox"
                checked={!!(form as any)[it.key]}
                onChange={(e) => setForm((p: any) => ({ ...p, [it.key]: e.target.checked }))}
                className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
              />
            </label>
          ))}
        </div>
        <div className="text-xs text-muted font-medium">Notification channels depend on device/browser support and Firebase configuration.</div>
      </div>

      <div className="premium-card space-y-4">
        <div className="text-sm font-extrabold text-navy">Theme Settings</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Theme Mode</label>
            <select
              className="input-field py-3"
              value={form.themeMode}
              onChange={(e) => setForm((p: any) => ({ ...p, themeMode: e.target.value }))}
            >
              <option value="auto">Auto (system)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted">Role theme</div>
            <div className="text-sm font-extrabold text-navy mt-2">Accent color follows your role.</div>
            <div className="text-xs text-muted font-medium mt-1">Admins and chairmen share the premium dashboard styling.</div>
          </div>
        </div>
      </div>

      <div className="premium-card space-y-4">
        <div className="text-sm font-extrabold text-navy">Security Settings</div>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-navy">Security alerts</div>
            <div className="text-xs text-muted font-medium mt-1">Notify on sensitive changes and sign-in anomalies.</div>
          </div>
          <input
            type="checkbox"
            checked={!!form.securityAlerts}
            onChange={(e) => setForm((p: any) => ({ ...p, securityAlerts: e.target.checked }))}
            className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
          />
        </label>
        <div className="text-xs text-muted font-medium">Some security features may require server-side enforcement and audit policies.</div>
      </div>

      <div className="premium-card space-y-4">
        <div className="text-sm font-extrabold text-navy">Activity Logs</div>
        {activityError ? <div className="text-xs text-muted font-medium">{activityError}</div> : null}
        {activity.length === 0 ? (
          <div className="text-sm text-muted italic">No recent activity logs available.</div>
        ) : (
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black uppercase tracking-widest text-primary">{String(a.action || 'activity')}</div>
                  <div className="text-[11px] text-muted font-bold">
                    {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : '—'}
                  </div>
                </div>
                {a.meta ? <pre className="mt-2 text-[11px] text-navy/70 overflow-auto">{JSON.stringify(a.meta, null, 2)}</pre> : null}
              </div>
            ))}
          </div>
        )}
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
