import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, linkWithPhoneNumber, PhoneAuthProvider, updatePhoneNumber } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AlertCircle, KeyRound, Loader2, Phone } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { normalizeTzPhoneE164 } from '../lib/phone';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyPhone() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  const phone = useMemo(() => profile?.phoneNumber || '', [profile?.phoneNumber]);
  const e164 = useMemo(() => normalizeTzPhoneE164(phone), [phone]);

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (profile?.phoneVerified) navigate('/dashboard', { replace: true });
  }, [navigate, profile?.phoneVerified]);

  const ensureRecaptcha = () => {
    if ((window as any).__fursalinkRecaptcha) return (window as any).__fursalinkRecaptcha as RecaptchaVerifier;
    const container = recaptchaRef.current;
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
    setLoading(true);
    try {
      const verifier = ensureRecaptcha();
      const result = await linkWithPhoneNumber(auth.currentUser, e164, verifier);
      setConfirmation(result);
      setInfo(`OTP sent to ${e164}.`);
    } catch (e: any) {
      setError(e?.message || 'Failed to send OTP. Ensure Phone provider is enabled in Firebase Auth.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError('');
    setInfo('');
    if (!confirmation) {
      setError('Send OTP first.');
      return;
    }
    setLoading(true);
    try {
      await confirmation.confirm(code.trim());
      if (auth.currentUser) {
        // Ensure phone number is set on the auth user.
        const cred = PhoneAuthProvider.credential(confirmation.verificationId, code.trim());
        await updatePhoneNumber(auth.currentUser, cred);
      }
      if (profile?.id) {
        await updateDoc(doc(db, 'users', profile.id), { phoneVerified: true, updatedAt: serverTimestamp() } as any);
      }
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

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
            <button disabled={loading} onClick={sendOtp} className="btn-primary w-full py-3 whitespace-nowrap">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
            </button>

            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                OTP Code
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

            <button disabled={loading || code.trim().length < 4} onClick={verify} className="btn-outline w-full py-3 whitespace-nowrap">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
            </button>
          </div>
        </div>
      </div>

      <div ref={recaptchaRef} />
    </div>
  );
}

