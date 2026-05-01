import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, linkWithPhoneNumber, PhoneAuthProvider, updatePhoneNumber } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AlertCircle, KeyRound, Loader2, Phone } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { normalizeTzPhoneE164 } from '../lib/phone';
import { useAuth } from '../contexts/AuthContext';
import { getAuthProvidersConsoleUrl } from '../lib/firebaseConsole';
import { getRecaptchaTokenV2Invisible } from '../lib/recaptcha';
import { OtpCodeInput } from '../components/OtpCodeInput';

function formatOtpError(e: any) {
  const code = e?.code || '';
  if (code === 'auth/billing-not-enabled') {
    const url = getAuthProvidersConsoleUrl();
    return url
      ? `Phone OTP is blocked because billing is not enabled on this Firebase project. Enable billing (Blaze plan) and Phone provider: ${url}`
      : 'Phone OTP is blocked because billing is not enabled on this Firebase project. Enable billing (Blaze plan) and the Phone provider in Firebase Authentication.';
  }
  if (code === 'auth/too-many-requests') return 'Too many requests. Please wait a moment and try again.';
  if (code === 'auth/quota-exceeded') return 'SMS quota exceeded for this project. Try again later.';
  if (code === 'auth/invalid-phone-number') return 'Invalid phone number format.';
  if (code === 'auth/operation-not-allowed') {
    const url = getAuthProvidersConsoleUrl();
    return url ? `Phone sign-in is disabled. Enable Phone provider: ${url}` : 'Phone sign-in is disabled. Enable Phone provider in Firebase Authentication.';
  }
  return e?.message || 'OTP failed. Please try again.';
}

export default function VerifyPhone() {
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const [serverOtp, setServerOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const firebaseRecaptchaRef = useRef<HTMLDivElement | null>(null);
  const serverRecaptchaRef = useRef<HTMLDivElement | null>(null);
  const recaptchaSiteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY as string | undefined;

  const phone = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    const fromQuery = qp.get('phone') || '';
    const fromStorage = localStorage.getItem('fursalink:pendingPhone') || '';
    return profile?.phoneNumber || fromQuery || fromStorage || '';
  }, [location.search, profile?.phoneNumber]);
  const e164 = useMemo(() => normalizeTzPhoneE164(phone), [phone]);

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (profile?.phoneVerified) navigate('/dashboard', { replace: true });
  }, [navigate, profile?.phoneVerified]);

  const ensureRecaptcha = () => {
    if ((window as any).__fursalinkRecaptcha) return (window as any).__fursalinkRecaptcha as RecaptchaVerifier;
    const container = firebaseRecaptchaRef.current;
    if (!container) throw new Error('Recaptcha container missing');
    const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
    (window as any).__fursalinkRecaptcha = verifier;
    return verifier;
  };

  const sendOtp = async () => {
    setError('');
    setInfo('');
    if (!auth.currentUser) {
      setError('Not signed in.');
      return;
    }
    if (!e164 || e164.length < 8) {
      setError('Missing phone number. Please return to registration and enter your phone number.');
      return;
    }
    if (cooldown > 0) return;
    setSending(true);
    try {
      const verifier = ensureRecaptcha();
      const result = await linkWithPhoneNumber(auth.currentUser, e164, verifier);
      setConfirmation(result);
      setServerOtp(false);
      setInfo(`OTP sent to ${e164}.`);
      setCooldown(60);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/billing-not-enabled' || code === 'auth/operation-not-allowed') {
        // Fallback: Vercel serverless + Twilio (no Firebase Phone provider required).
        try {
          const token = await auth.currentUser.getIdToken();
          const recaptchaToken =
            recaptchaSiteKey && serverRecaptchaRef.current
              ? await getRecaptchaTokenV2Invisible({ container: serverRecaptchaRef.current, siteKey: recaptchaSiteKey })
              : undefined;
          const res = await fetch('/api/otp/send', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ purpose: 'verify_phone', phone: e164, recaptchaToken }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body?.detail || body?.error || 'Failed to send OTP.');
          setServerOtp(true);
          setConfirmation(null);
          setInfo(`OTP sent to ${e164}.`);
          setCooldown(60);
        } catch (err: any) {
          setError(
            [
              formatOtpError(e),
              'Alternative OTP is available via Vercel/Twilio but is not configured.',
              `(${err?.message || 'unknown error'})`,
            ].join(' '),
          );
        }
      } else {
        setError(formatOtpError(e));
      }
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    setError('');
    setInfo('');
    if (!confirmation && !serverOtp) {
      setError('Send OTP first.');
      return;
    }
    setVerifying(true);
    try {
      if (serverOtp) {
        if (!auth.currentUser) throw new Error('Not signed in.');
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ purpose: 'verify_phone', code: code.trim() }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.detail || body?.error || 'OTP verification failed.');
        if (profile?.id) {
          await updateDoc(doc(db, 'users', profile.id), { phoneVerified: true, updatedAt: serverTimestamp() } as any);
        }
      } else {
        await confirmation.confirm(code.trim());
        if (auth.currentUser) {
          // Ensure phone number is set on the auth user.
          const cred = PhoneAuthProvider.credential(confirmation.verificationId, code.trim());
          await updatePhoneNumber(auth.currentUser, cred);
        }
        if (profile?.id) {
          await updateDoc(doc(db, 'users', profile.id), { phoneVerified: true, updatedAt: serverTimestamp() } as any);
        }
      }
      localStorage.removeItem('fursalink:pendingPhone');
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
          <h1 className="text-2xl font-extrabold text-navy">Verify Phone</h1>
          <p className="text-sm text-muted font-medium mt-2">
            Enter the OTP sent to <span className="font-bold text-navy">{phone}</span> to activate your account.
          </p>

          {error && (
            <div className="mt-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
          {info && (
            <div className="mt-6 p-4 bg-emerald/10 border border-emerald/20 text-emerald rounded-xl flex items-center gap-3">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{info}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <button disabled={sending || cooldown > 0} onClick={sendOtp} className="btn-primary w-full py-3 whitespace-nowrap">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP'}
            </button>

            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                OTP Code
              </label>
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

      <div ref={firebaseRecaptchaRef} />
      <div ref={serverRecaptchaRef} className="sr-only" aria-hidden="true" />
    </div>
  );
}
