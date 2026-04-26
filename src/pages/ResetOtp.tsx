import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AlertCircle, KeyRound, Loader2, Phone, ShieldCheck } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { normalizeTzPhoneE164 } from '../lib/phone';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { normalizeStoredRole } from '../lib/roles';

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
  const [confirmation, setConfirmation] = useState<any>(null);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setThemeRole('candidate'), [setThemeRole]);

  const e164 = useMemo(() => normalizeTzPhoneE164(phoneNumber), [phoneNumber]);

  const ensureRecaptcha = () => {
    if ((window as any).__fursalinkRecaptchaReset) return (window as any).__fursalinkRecaptchaReset as RecaptchaVerifier;
    const container = recaptchaRef.current;
    if (!container) throw new Error('Recaptcha container missing');
    const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
    (window as any).__fursalinkRecaptchaReset = verifier;
    return verifier;
  };

  const sendOtp = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const verifier = ensureRecaptcha();
      const result = await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmation(result);
      setInfo(t('resetOtp.sent'));
    } catch (e: any) {
      setError(e?.message || t('resetOtp.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    setInfo('');
    if (!confirmation) {
      setError(t('resetOtp.sendFirst'));
      return;
    }
    setLoading(true);
    try {
      await confirmation.confirm(code.trim());

      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error(t('resetOtp.notSignedIn'));

      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        await auth.signOut();
        setConfirmation(null);
        setError(t('resetOtp.noProfile'));
        return;
      }

      const role = normalizeStoredRole((snap.data() as any)?.role);
      if (role !== 'candidate') {
        await auth.signOut();
        setConfirmation(null);
        setError(t('resetOtp.roleMismatch'));
        return;
      }

      setInfo(t('resetOtp.verified'));
    } catch (e: any) {
      setError(e?.message || t('resetOtp.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

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
      if (!auth.currentUser) throw new Error(t('resetOtp.notSignedIn'));
      await updatePassword(auth.currentUser, newPin);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { updatedAt: serverTimestamp() } as any);
      await auth.signOut();
      setInfo(t('resetOtp.done'));
      navigate('/login?role=candidate', { replace: true });
    } catch (e: any) {
      setError(e?.message || t('resetOtp.failed'));
    } finally {
      setLoading(false);
    }
  };

  const otpVerified = !!auth.currentUser && !!confirmation;

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

            <button disabled={loading || !phoneNumber.trim()} onClick={sendOtp} className="btn-primary w-full py-3 whitespace-nowrap">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('resetOtp.send')}
            </button>

            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                {t('resetOtp.code')}
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  inputMode="numeric"
                  className="glass-input pl-11 tracking-[0.3em] text-center font-extrabold"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            <button disabled={loading || !confirmation || code.trim().length < 4} onClick={verifyOtp} className="btn-outline w-full py-3 whitespace-nowrap">
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

      <div ref={recaptchaRef} />
    </div>
  );
}

