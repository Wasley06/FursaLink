import React, { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { Loader2, Settings2, Trash2, Wrench } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { logAudit } from '../../lib/audit';

type FormState = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  minDesktopVersion: string;
};

export default function DeveloperSystemPage() {
  const { config } = useSystemConfig();
  const initial = useMemo<FormState>(
    () => ({
      maintenanceEnabled: !!config?.maintenanceEnabled,
      maintenanceMessage: config?.maintenanceMessage || '',
      minDesktopVersion: config?.minDesktopVersion || '',
    }),
    [config?.maintenanceEnabled, config?.maintenanceMessage, config?.minDesktopVersion],
  );

  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  React.useEffect(() => setForm(initial), [initial]);

  const save = async () => {
    setSaving(true);
    setError('');
    setResult('');
    try {
      await setDoc(
        doc(db, 'systemConfig', 'global'),
        {
          maintenanceEnabled: form.maintenanceEnabled,
          maintenanceMessage: form.maintenanceMessage || '',
          minDesktopVersion: form.minDesktopVersion || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await logAudit('developer:systemConfig:update', { maintenanceEnabled: form.maintenanceEnabled });
      setResult('System config saved.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save system config.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDemoCandidates = async () => {
    if (!confirm('Delete ALL demo candidates (isDemo=true) from Firestore?')) return;
    setCleaning(true);
    setError('');
    setResult('');
    try {
      let deleted = 0;
      for (;;) {
        const snap = await getDocs(query(collection(db, 'users'), where('isDemo', '==', true), limit(250)));
        if (snap.empty) break;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(doc(db, 'users', d.id)));
        await batch.commit();
        deleted += snap.size;
        setResult(`Deleted ${deleted} demo candidates…`);
        if (snap.size < 250) break;
      }
      await logAudit('developer:demo:delete', { deleted });
      setResult(`Deleted ${deleted} demo candidates.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete demo data.');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">System Configuration</h1>
            <p className="text-sm text-muted font-medium">Maintenance mode, minimum desktop version, and demo cleanup.</p>
          </div>
        </div>
      </div>

      {(error || result) && (
        <div className="premium-card">
          {error && <div className="text-sm text-danger font-bold">{error}</div>}
          {result && <div className="text-sm text-emerald font-bold">{result}</div>}
        </div>
      )}

      <div className="premium-card space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div className="text-sm font-extrabold text-navy">Maintenance</div>
        </div>

        <label className="flex items-center gap-3 text-sm font-bold text-navy">
          <input
            type="checkbox"
            checked={form.maintenanceEnabled}
            onChange={(e) => setForm((p) => ({ ...p, maintenanceEnabled: e.target.checked }))}
            className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
          />
          Enable maintenance mode (blocks non-developer access)
        </label>

        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Message</label>
          <input
            className="input-field"
            value={form.maintenanceMessage}
            onChange={(e) => setForm((p) => ({ ...p, maintenanceMessage: e.target.value }))}
            placeholder="Maintenance is in progress…"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Minimum Desktop Version</label>
          <input
            className="input-field"
            value={form.minDesktopVersion}
            onChange={(e) => setForm((p) => ({ ...p, minDesktopVersion: e.target.value }))}
            placeholder="e.g., 1.0.4"
          />
          <div className="text-xs text-muted font-medium mt-2">
            Use this to require desktop clients to update.
          </div>
        </div>

        <button disabled={saving} onClick={save} className="btn-primary w-full py-3">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save System Config'}
        </button>
      </div>

      <div className="premium-card space-y-4">
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-danger" />
          <div className="text-sm font-extrabold text-navy">Demo Data</div>
        </div>
        <div className="text-sm text-muted font-medium">
          Deletes only documents where <span className="font-bold text-navy">isDemo=true</span>.
        </div>
        <button disabled={cleaning} onClick={deleteDemoCandidates} className="btn-outline w-full py-3 border-danger text-danger hover:bg-danger/10">
          {cleaning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete Demo Candidates'}
        </button>
      </div>
    </div>
  );
}

