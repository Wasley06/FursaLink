import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDocFromServer } from 'firebase/firestore';
import { Check, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getLiveAppUrl } from '../../lib/liveAppUrl';

function JsonBlock({ value }: { value: any }) {
  return (
    <pre className="mt-3 rounded-xl bg-navy text-white/90 p-4 text-[11px] leading-relaxed overflow-auto border border-white/10">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function DeveloperToolsPage() {
  const { profile } = useAuth();
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const diagnostics = useMemo(() => {
    const liveUrl = getLiveAppUrl();
    const electronUrl = typeof window !== 'undefined' ? window.FursaLink?.appUrl ?? null : null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
      app: {
        liveUrl,
        electronUrl,
        mode: (import.meta as any).env?.MODE,
        baseUrl: (import.meta as any).env?.BASE_URL,
      },
      user: {
        uid: auth.currentUser?.uid ?? null,
        email: auth.currentUser?.email ?? null,
        emailVerified: auth.currentUser?.emailVerified ?? null,
        role: profile?.role ?? null,
        name: profile?.fullName ?? null,
      },
      device: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        language: typeof navigator !== 'undefined' ? navigator.language : null,
        timezone: tz,
      },
      storage: {
        themeRole: localStorage.getItem('fursalink:themeRole'),
        controllerDistrict: localStorage.getItem('fursalink:controllerDistrict'),
      },
    };
  }, [profile?.fullName, profile?.role]);

  const pingFirestore = async () => {
    setPinging(true);
    setPingResult('');
    try {
      // systemConfig/global is publicly readable per rules and safe to use as a connectivity probe.
      const snap = await getDocFromServer(doc(db, 'systemConfig', 'global'));
      setPingResult(snap.exists() ? 'OK (systemConfig/global readable)' : 'OK (systemConfig/global missing)');
    } catch (e: any) {
      setPingResult(`FAILED: ${e?.code || e?.message || 'unknown'}`);
    } finally {
      setPinging(false);
    }
  };

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const clearLocalState = () => {
    localStorage.removeItem('fursalink:themeRole');
    localStorage.removeItem('fursalink:controllerDistrict');
    localStorage.removeItem('fursalink:demoSession');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="text-[10px] font-black text-muted uppercase tracking-widest">Developer Tools</div>
        <h1 className="text-2xl font-extrabold text-navy mt-2">Diagnostics & Utilities</h1>
        <p className="text-sm text-muted font-medium mt-2">
          Quick environment probes, copy-ready diagnostics, and safe local reset actions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="premium-card">
          <div className="text-sm font-extrabold text-navy">Control Center</div>
          <div className="text-xs text-muted font-medium mt-2">
            Feature flags, theme overrides, default language, maintenance, and banners.
          </div>
          <div className="mt-4">
            <Link to="/developer/system" className="btn-primary w-full py-3 text-center block">
              Open System Control Center
            </Link>
          </div>
        </div>

        <div className="premium-card">
          <div className="text-sm font-extrabold text-navy">Identity & Audit</div>
          <div className="text-xs text-muted font-medium mt-2">
            User directory, role verification, and audit logs.
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/developer/directory" className="btn-outline w-full justify-center py-3 text-xs font-black uppercase tracking-widest">
              Users
            </Link>
            <Link to="/developer/security" className="btn-outline w-full justify-center py-3 text-xs font-black uppercase tracking-widest">
              Audit Logs
            </Link>
          </div>
        </div>

        <div className="premium-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-navy">Connectivity Probe</div>
              <div className="text-xs text-muted font-medium mt-1">Checks Firestore connectivity via `systemConfig/global`.</div>
            </div>
            <button
              type="button"
              disabled={pinging}
              onClick={pingFirestore}
              className="btn-outline px-4 py-2 text-xs font-black uppercase tracking-widest"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Ping
            </button>
          </div>
          {pingResult && <div className="mt-3 text-xs font-bold text-navy">{pingResult}</div>}
        </div>

        <div className="premium-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-navy">Local Reset</div>
              <div className="text-xs text-muted font-medium mt-1">Clears theme + district + demo session and reloads.</div>
            </div>
            <button
              type="button"
              onClick={clearLocalState}
              className="btn-outline px-4 py-2 text-xs font-black uppercase tracking-widest"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear
            </button>
          </div>
        </div>
      </div>

      <div className="premium-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-navy">Diagnostics Snapshot</div>
            <div className="text-xs text-muted font-medium mt-1">Copy this block into support tickets or audits.</div>
          </div>
          <button
            type="button"
            onClick={copyDiagnostics}
            className="btn-outline px-4 py-2 text-xs font-black uppercase tracking-widest"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <JsonBlock value={diagnostics} />
      </div>
    </div>
  );
}
