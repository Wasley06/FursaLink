import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { AlertCircle, KeyRound, Loader2, Phone, ShieldCheck } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { normalizeTzPhoneE164 } from '../lib/phone';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { OtpCodeInput } from '../components/OtpCodeInput';
import { normalizeStoredRole } from '../lib/roles';
import { getRecaptchaTokenV2Invisible } from '../lib/recaptcha';

function formatOtpError(e: any) {
  return e?.message || 'OTP failed. Please try again.';
}

export default function ResetOtp() {
  const navigate = useNavigate();
  const { setThemeRole } = useTheme();
  const { t } = useI18n();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [challengeSent, setChallengeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const serverRecaptchaRef = useRef<HTMLDivElement | null>(null);
  const recaptchaSiteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY as string | undefined;

  useEffect(() => setThemeRole('candidate'), [setThemeRole]);

  const e164 = useMemo(() => normalizeTzPhoneE164(phoneNumber), [phoneNumber]);

  const sendOtp = async () => {
    setError('');
    setInfo('');
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const recaptchaToken =
        recaptchaSiteKey && serverRecaptchaRef.current
          ? await getRecaptchaTokenV2Invisible({ container: serverRecaptchaRef.current, siteKey: recaptchaSiteKey })
          : undefined;
      const res = await fetch('/api/otp/send-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, recaptchaToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail || body?.error || 'Failed to send OTP.');
      setChallengeSent(true);
      setVerified(false);
      setInfo(t('resetOtp.sent'));
      setCooldown(60);
    } catch (e: any) {
      setError(formatOtpError(e) || t('resetOtp.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    setInfo('');
    if (!challengeSent) {
      setError(t('resetOtp.sendFirst'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: code.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail || body?.error || t('resetOtp.invalidCode'));

      // Optional role check: look up the candidate by phone after verification (best-effort).
      try {
        const snap = await getDoc(doc(db, 'users', auth.currentUser?.uid || '__missing'));
        if (snap.exists()) {
          const role = normalizeStoredRole((snap.data() as any)?.role);
          if (role !== 'candidate') {
            setError(t('resetOtp.roleMismatch'));
            return;
          }
        }
      } catch {
        // ignore
      }

      setVerified(true);
      setInfo(t('resetOtp.verified'));
    } catch (e: any) {
      setError(formatOtpError(e) || t('resetOtp.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const tmr = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(tmr);
  }, [cooldown]);

  const setNewPasswordNow = async () => {
    setError('');
    setInfo('');
    if (newPin !== confirmPin) {
      setError(t('resetOtp.pinMismatch'));
      return;
    }
    if (newPin.length < 8) {
      setError(t('resetOtp.pinTooShort'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: code.trim(), newPassword: newPin }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail || body?.error || t('resetOtp.failed'));
      setInfo(t('resetOtp.done'));
      navigate('/login?role=candidate', { replace: true });
    } catch (e: any) {
      setError(e?.message || t('resetOtp.failed'));
    } finally {
      setLoading(false);
    }
  };

  const otpVerified = challengeSent && verified;

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky p-6 overflow-hidden relative font-sans">
      <div className="absolute inset-0 bg-glass-radial pointer-events-none" />
      <div className="max-w-md w-full glass-card overflow-hidden">
        <div className="p-10">
          <h1 className="text-2xl font-extrabold text-navy">{t('resetOtp.title')}</h1>
          <p className="text-sm text-muted font-medium mt-2">{t('resetOtp.subtitle')}</p>

          {error && (
            <div className="mt-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
          {info && (
            <div className="mt-6 p-4 bg-emerald/10 border border-emerald/20 text-emerald rounded-xl flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{info}</p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                {t('login.phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="tel"
                  className="glass-input pl-11"
                  placeholder="e.g., 0777123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="mt-2 text-xs text-muted font-medium">{t('resetOtp.e164')}: <span className="font-bold text-navy">{e164}</span></div>
            </div>

            <button disabled={loading || !phoneNumber.trim() || cooldown > 0} onClick={sendOtp} className="btn-primary w-full py-3 whitespace-nowrap">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : cooldown > 0 ? `Resend in ${cooldown}s` : t('resetOtp.send')}
            </button>

            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                {t('resetOtp.code')}
              </label>
              <div className="flex items-center justify-center gap-3">
                <KeyRound className="w-4 h-4 text-muted" />
                <OtpCodeInput value={code} onChange={setCode} disabled={loading} />
              </div>
            </div>

            <button disabled={loading || !challengeSent || code.trim().length < 6} onClick={verifyOtp} className="btn-outline w-full py-3 whitespace-nowrap">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('resetOtp.verify')}
            </button>

            <div className="pt-4 border-t border-white/50">
              <div className="text-sm font-extrabold text-navy">{t('resetOtp.newPin')}</div>
              <div className="grid grid-cols-1 gap-3 mt-3">
                <input
                  type="password"
                  className="input-field"
                  placeholder={t('resetOtp.pinPlaceholder')}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
                <input
                  type="password"
                  className="input-field"
                  placeholder={t('resetOtp.pinConfirmPlaceholder')}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                />
              </div>
              <button
                disabled={loading || !otpVerified || newPin.length < 8 || confirmPin.length < 8}
                onClick={setNewPasswordNow}
                className="btn-primary w-full py-3 mt-4 whitespace-nowrap"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('resetOtp.setPin')}
              </button>
            </div>

            <div className="text-center text-[11px] font-bold uppercase tracking-widest text-muted pt-2">
              <Link to="/login?role=candidate" className="text-primary hover:underline">
                {t('resetOtp.back')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div ref={serverRecaptchaRef} className="sr-only" aria-hidden="true" />
    </div>
  );
}
