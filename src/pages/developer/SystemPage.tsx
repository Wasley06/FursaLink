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
  defaultLanguage: 'en' | 'sw';
  bannerEnabled: boolean;
  bannerLevel: 'info' | 'warning' | 'critical';
  bannerMessage: string;
  featureFlags: Record<string, boolean>;
  themeOverrides: {
    chairman: { primary: string; primaryHover: string };
    candidate: { primary: string; primaryHover: string };
    controller: { primary: string; primaryHover: string };
    developer: { primary: string; primaryHover: string };
  };
};

export default function DeveloperSystemPage() {
  const { config } = useSystemConfig();
  const initial = useMemo<FormState>(
    () => ({
      maintenanceEnabled: !!config?.maintenanceEnabled,
      maintenanceMessage: config?.maintenanceMessage || '',
      minDesktopVersion: config?.minDesktopVersion || '',
      defaultLanguage: config?.defaultLanguage === 'sw' ? 'sw' : 'en',
      bannerEnabled: !!config?.announcementBanner?.enabled,
      bannerLevel:
        config?.announcementBanner?.level === 'critical'
          ? 'critical'
          : config?.announcementBanner?.level === 'warning'
            ? 'warning'
            : 'info',
      bannerMessage: config?.announcementBanner?.message || '',
      featureFlags: (config?.featureFlags as any) || {},
      themeOverrides: {
        chairman: {
          primary: config?.themeOverrides?.chairman?.primary || '',
          primaryHover: config?.themeOverrides?.chairman?.primaryHover || '',
        },
        candidate: {
          primary: config?.themeOverrides?.candidate?.primary || '',
          primaryHover: config?.themeOverrides?.candidate?.primaryHover || '',
        },
        controller: {
          primary: config?.themeOverrides?.controller?.primary || '',
          primaryHover: config?.themeOverrides?.controller?.primaryHover || '',
        },
        developer: {
          primary: config?.themeOverrides?.developer?.primary || '',
          primaryHover: config?.themeOverrides?.developer?.primaryHover || '',
        },
      },
    }),
    [
      config?.maintenanceEnabled,
      config?.maintenanceMessage,
      config?.minDesktopVersion,
      config?.defaultLanguage,
      config?.announcementBanner?.enabled,
      config?.announcementBanner?.level,
      config?.announcementBanner?.message,
      config?.featureFlags,
      config?.themeOverrides,
    ],
  );

  const [form, setForm] = useState<FormState>(initial);
  const [newFlagKey, setNewFlagKey] = useState('');
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
          defaultLanguage: form.defaultLanguage,
          announcementBanner: {
            enabled: form.bannerEnabled,
            level: form.bannerLevel,
            message: form.bannerMessage || '',
          },
          featureFlags: form.featureFlags || {},
          themeOverrides: {
            chairman: {
              primary: form.themeOverrides.chairman.primary || '',
              primaryHover: form.themeOverrides.chairman.primaryHover || '',
            },
            candidate: {
              primary: form.themeOverrides.candidate.primary || '',
              primaryHover: form.themeOverrides.candidate.primaryHover || '',
            },
            controller: {
              primary: form.themeOverrides.controller.primary || '',
              primaryHover: form.themeOverrides.controller.primaryHover || '',
            },
            developer: {
              primary: form.themeOverrides.developer.primary || '',
              primaryHover: form.themeOverrides.developer.primaryHover || '',
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await logAudit('developer:systemConfig:update', {
        maintenanceEnabled: form.maintenanceEnabled,
        defaultLanguage: form.defaultLanguage,
        bannerEnabled: form.bannerEnabled,
        flags: Object.keys(form.featureFlags || {}).length,
      });
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
          <Wrench className="w-5 h-5 text-primary" />
          <div className="text-sm font-extrabold text-navy">Remote Banner</div>
        </div>

        <label className="flex items-center gap-3 text-sm font-bold text-navy">
          <input
            type="checkbox"
            checked={form.bannerEnabled}
            onChange={(e) => setForm((p) => ({ ...p, bannerEnabled: e.target.checked }))}
            className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
          />
          Enable system-wide announcement banner
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Level</label>
            <select
              className="glass-input text-navy font-bold appearance-none cursor-pointer"
              value={form.bannerLevel}
              onChange={(e) => setForm((p) => ({ ...p, bannerLevel: e.target.value as any }))}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Message</label>
            <input
              className="input-field"
              value={form.bannerMessage}
              onChange={(e) => setForm((p) => ({ ...p, bannerMessage: e.target.value }))}
              placeholder="System update: ... "
            />
          </div>
        </div>
      </div>

      <div className="premium-card space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div className="text-sm font-extrabold text-navy">Feature Flags</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="input-field md:col-span-2"
            value={newFlagKey}
            onChange={(e) => setNewFlagKey(e.target.value)}
            placeholder="flag.key (e.g. enableNewOnboarding)"
          />
          <button
            type="button"
            className="btn-outline w-full py-3 text-xs font-black uppercase tracking-widest"
            onClick={() => {
              const key = (newFlagKey || '').trim();
              if (!key) return;
              setForm((p) => ({ ...p, featureFlags: { ...(p.featureFlags || {}), [key]: true } }));
              setNewFlagKey('');
            }}
          >
            Add Flag
          </button>
        </div>

        {Object.keys(form.featureFlags || {}).length === 0 ? (
          <div className="text-sm text-muted font-medium">No feature flags yet.</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(form.featureFlags || {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-widest text-navy/60 truncate">{k}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-navy">
                      <input
                        type="checkbox"
                        checked={!!v}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, featureFlags: { ...(p.featureFlags || {}), [k]: e.target.checked } }))
                        }
                        className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
                      />
                      Enabled
                    </label>
                    <button
                      type="button"
                      className="btn-outline px-3 py-2 text-xs font-black uppercase tracking-widest border-danger text-danger hover:bg-danger/10"
                      onClick={() =>
                        setForm((p) => {
                          const next = { ...(p.featureFlags || {}) };
                          delete next[k];
                          return { ...p, featureFlags: next };
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="premium-card space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div className="text-sm font-extrabold text-navy">Theme Manager</div>
        </div>
        <div className="text-sm text-muted font-medium">
          Optional role color overrides (leave blank to use defaults). Applies live across devices.
        </div>

        {(['chairman', 'candidate', 'controller', 'developer'] as const).map((role) => (
          <div key={role} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4 space-y-3">
            <div className="text-xs font-black uppercase tracking-widest text-navy/60">{role}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Primary</label>
                <input
                  className="input-field"
                  value={(form.themeOverrides as any)[role].primary}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      themeOverrides: { ...p.themeOverrides, [role]: { ...(p.themeOverrides as any)[role], primary: e.target.value } } as any,
                    }))
                  }
                  placeholder="#RRGGBB"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Primary Hover</label>
                <input
                  className="input-field"
                  value={(form.themeOverrides as any)[role].primaryHover}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      themeOverrides: { ...p.themeOverrides, [role]: { ...(p.themeOverrides as any)[role], primaryHover: e.target.value } } as any,
                    }))
                  }
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div className="text-sm font-extrabold text-navy">Localization Defaults</div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Default Language</label>
          <select
            className="glass-input text-navy font-bold appearance-none cursor-pointer"
            value={form.defaultLanguage}
            onChange={(e) => setForm((p) => ({ ...p, defaultLanguage: e.target.value as any }))}
          >
            <option value="en">English</option>
            <option value="sw">Swahili</option>
          </select>
          <div className="text-xs text-muted font-medium mt-2">
            Only applies to users who havenâ€™t explicitly set a language in their browser.
          </div>
        </div>
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
