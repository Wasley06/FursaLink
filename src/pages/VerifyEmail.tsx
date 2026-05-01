import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound, Loader2, Mail } from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient, getSupabaseClientConfig } from '../lib/supabaseClient';
import { OtpCodeInput } from '../components/OtpCodeInput';
import { getLiveAppUrl } from '../lib/liveAppUrl';

function formatOtpError(e: any) {
  const msg = String(e?.message || '');
  const lower = msg.toLowerCase();
  if (lower.includes('signups not allowed')) return 'Email OTP is not available yet. Please try again in a moment.';
  if (lower.includes('smtp') && (lower.includes('not configured') || lower.includes('not set') || lower.includes('server'))) {
    return 'Email OTP server is not configured. Set SMTP in Supabase Auth (SMTP settings) and try again.';
  }
  if (lower.includes('not_found') || lower.includes('not found') || lower.includes('404')) {
    return [
      'Email OTP endpoint returned NOT_FOUND.',
      'Confirm `VITE_SUPABASE_URL` is exactly `https://<project>.supabase.co` (no `/auth/v1`).',
      'Then hard refresh / restart the desktop app to load the latest build.',
    ].join(' ');
  }
  if (lower.includes('expired')) return 'OTP expired. Please resend and try again.';
  if (lower.includes('invalid') || lower.includes('token')) return 'Invalid OTP. Please try again.';
  return msg || 'Email verification failed. Please try again.';
}

export default function VerifyEmail() {
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const [diag, setDiag] = useState<string>('');

  const email = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    const fromQuery = qp.get('email') || '';
    const fromStorage = localStorage.getItem('fursalink:pendingEmail') || '';
    return profile?.contactEmail || fromQuery || fromStorage || '';
  }, [location.search, profile?.contactEmail]);

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (profile?.emailVerified) navigate('/dashboard', { replace: true });
  }, [navigate, profile?.emailVerified]);

  const sendOtp = async () => {
    setError('');
    setInfo('');
    setDiag('');
    if (!auth.currentUser) {
      setError('Not signed in.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Missing email address. Please return to registration and enter your email.');
      return;
    }
    if (cooldown > 0) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
      return;
    }

    setSending(true);
    try {
      // Ensure the contact email exists as a Supabase Auth user even when Supabase signups are disabled.
      // This keeps public signups off while still allowing OTP emails for verified candidates.
      try {
        const token = await auth.currentUser.getIdToken();
        const ensureRes = await fetch(`${getLiveAppUrl()}/api/supabase/ensure-auth-user`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        });
        const ct = ensureRes.headers.get('content-type') || '';
        const ensureBody = ct.includes('application/json') ? await ensureRes.json().catch(() => ({})) : {};
        if (!ensureRes.ok) {
          const detail =
            ct.includes('application/json')
              ? String(ensureBody?.detail || ensureBody?.error || '')
              : ensureRes.status === 404
                ? 'Email OTP server endpoint is missing (404). Ensure Vercel routes allow `/api/*` functions.'
                : '';
          throw new Error(detail || 'Email OTP server is not configured.');
        }
      } catch (e: any) {
        setError(e?.message || 'Email OTP server is not configured.');
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;

      setSent(true);
      setInfo(`OTP sent to ${email}.`);
      setCooldown(60);
    } catch (e: any) {
      setError(formatOtpError(e));
    } finally {
      setSending(false);
    }
  };

  const runDiagnostics = async () => {
    setDiag('');
    const cfg = getSupabaseClientConfig();
    const url = cfg?.url || '';
    const keyPrefix = cfg?.anonKey ? `${cfg.anonKey.slice(0, 12)}…` : '';
    try {
      if (!url) {
        setDiag('Supabase config missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not found at runtime.');
        return;
      }
      const r = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: cfg?.anonKey || '' },
      });
      const txt = await r.text().catch(() => '');
      setDiag(
        [
          `VITE_SUPABASE_URL: ${url}`,
          `VITE_SUPABASE_ANON_KEY: ${keyPrefix || '(missing)'}`,
          `GET /auth/v1/settings: ${r.status}`,
          txt ? `Body: ${txt.slice(0, 180)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    } catch (e: any) {
      setDiag([`VITE_SUPABASE_URL: ${url || '(missing)'}`, `Error: ${String(e?.message || e)}`].join('\n'));
    }
  };

  const verify = async () => {
    setError('');
    setInfo('');
    if (!sent) {
      setError('Send OTP first.');
      return;
    }
    if (!auth.currentUser) {
      setError('Not signed in.');
      return;
    }
    if (code.trim().length < 6) {
      setError('Enter the OTP code.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
      return;
    }

    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      });
      if (error) throw error;

      if (profile?.id) {
        await updateDoc(doc(db, 'users', profile.id), {
          emailVerified: true,
          updatedAt: serverTimestamp(),
        } as any);
      }

      localStorage.removeItem('fursalink:pendingEmail');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(formatOtpError(e));
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky p-6 overflow-hidden relative font-sans">
      <div className="absolute inset-0 bg-glass-radial pointer-events-none" />
      <div className="max-w-md w-full glass-card overflow-hidden">
        <div className="p-10">
          <h1 className="text-2xl font-extrabold text-navy">Verify Email</h1>
          <p className="text-sm text-muted font-medium mt-2">
            Enter the OTP sent to <span className="font-bold text-navy">{email || 'your email'}</span> to activate your account.
          </p>

          {error && (
            <div className="mt-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
          {error && error.toLowerCase().includes('not_found') ? (
            <div className="mt-3">
              <button type="button" className="btn-outline w-full py-2.5 text-xs" onClick={runDiagnostics}>
                Run diagnostics
              </button>
              {diag ? (
                <pre className="mt-3 rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md p-4 text-[11px] text-navy whitespace-pre-wrap">
                  {diag}
                </pre>
              ) : null}
            </div>
          ) : null}
          {info && (
            <div className="mt-6 p-4 bg-emerald/10 border border-emerald/20 text-emerald rounded-xl flex items-center gap-3">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{info}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <button disabled={sending || cooldown > 0} onClick={sendOtp} className="btn-primary w-full py-3 whitespace-nowrap">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Email OTP'}
            </button>

            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">OTP Code</label>
              <div className="flex items-center justify-center gap-3">
                <KeyRound className="w-4 h-4 text-muted" />
                <OtpCodeInput value={code} onChange={setCode} disabled={verifying} />
              </div>
            </div>

            <button disabled={verifying || code.trim().length < 6} onClick={verify} className="btn-outline w-full py-3 whitespace-nowrap">
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
