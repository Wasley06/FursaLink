import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Loader2, Lock, Phone, ShieldCheck, User } from 'lucide-react';
import { labelForRole, normalizeLoginRole, normalizeStoredRole } from '../lib/roles';
import { getAuthProvidersConsoleUrl } from '../lib/firebaseConsole';
import { DEMO_PIN, DEMO_USERS } from '../lib/demoSession';
import { useAuth } from '../contexts/AuthContext';
import { readViteEnvBool, readViteEnv } from '../lib/env';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { DISTRICTS, type District } from '../constants/locations';

export default function Login() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { signInDemo } = useAuth();
  const { setThemeRole } = useTheme();
  const { t } = useI18n();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [controllerDistrict, setControllerDistrict] = useState<District | ''>(() => {
    const raw = localStorage.getItem('fursalink:controllerDistrict') || '';
    return (DISTRICTS as any).includes(raw) ? (raw as District) : '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const selectedRole = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    return normalizeLoginRole(params.role || qp.get('role'));
  }, [location.search, params.role]);

  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const fromQuery = qp.get('phone') || '';
    const fromStorage = localStorage.getItem('fursalink:pendingPhone') || '';
    if (selectedRole !== 'developer' && !phoneNumber.trim()) {
      const initial = (fromQuery || fromStorage || '').trim();
      if (initial) setPhoneNumber(initial);
    }
  }, [location.search, phoneNumber, selectedRole]);

  useEffect(() => {
    setThemeRole(selectedRole);
  }, [selectedRole, setThemeRole]);

  const setRole = (role: 'candidate' | 'controller' | 'chairman' | 'administrator' | 'developer') => {
    const qp = new URLSearchParams(location.search);
    qp.set('role', role);
    setThemeRole(role);
    navigate({ pathname: '/login', search: `?${qp.toString()}` }, { replace: true });
  };

  const loginDomain = readViteEnv('VITE_LOGIN_EMAIL_DOMAIN') || 'fursalink.znz';
  const usernameToEmail = (raw: string) => {
    const slug = raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9._-]/g, '');
    return `${slug}@${loginDomain}`;
  };

  const developerIdentifierToEmail = (raw: string) => {
    const cleaned = raw.trim();
    if (cleaned.includes('@')) return cleaned.toLowerCase();
    return usernameToEmail(cleaned);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (selectedRole !== 'developer' && phoneNumber.trim().includes('@')) {
        setError('Enter your phone number (not an email address).');
        return;
      }
      if (selectedRole === 'controller') {
        if (!controllerDistrict) {
          setError('Select your district to continue.');
          return;
        }
        localStorage.setItem('fursalink:controllerDistrict', controllerDistrict);
      }

      const email = selectedRole === 'developer' ? developerIdentifierToEmail(username) : `${phoneNumber}@${loginDomain}`;
      await setPersistence(auth, staySignedIn ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);

      // Enforce role selection (prevents cross-role sign-in).
      const uid = auth.currentUser?.uid;
      if (uid) {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) {
          // Self-heal for developer: create the missing profile document.
          // This avoids lockouts when Auth user exists but the Firestore profile was never created.
          if (selectedRole === 'developer') {
            const devName = (username || '').trim() || 'Wasley DEV';
            await setDoc(doc(db, 'users', uid), {
              fullName: devName,
              phoneNumber: '0700000000',
              role: 'developer',
              phoneVerified: true,
              profileProgress: 100,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              seededBy: 'login:self-heal',
            } as any);
          } else {
            await auth.signOut();
            setError(`Account profile not found. Create Firestore document users/${uid} with role=${selectedRole}.`);
            return;
          }
        }
        let snap2 = snap.exists() ? snap : await getDoc(doc(db, 'users', uid));
        let actualRole = normalizeStoredRole((snap2.data() as any)?.role);

        // Developer bootstrap: allow a pre-approved dev account to self-promote via a server-side (Firebase Admin) endpoint.
        // This fixes the common "Auth user exists but users/{uid}.role is still candidate" mismatch.
        let bootstrapError: string | null = null;
        if (selectedRole === 'developer' && actualRole !== 'developer') {
          try {
            // First try a direct self-promotion write (allowed only for pre-approved dev email via Firestore rules).
            await setDoc(
              doc(db, 'users', uid),
              {
                role: 'developer',
                updatedAt: serverTimestamp(),
                seededBy: 'login:bootstrap-role',
              } as any,
              { merge: true },
            );
            snap2 = await getDoc(doc(db, 'users', uid));
            actualRole = normalizeStoredRole((snap2.data() as any)?.role);
            if (actualRole === 'developer') {
              bootstrapError = null;
              // proceed
            } else {
              throw new Error('direct_bootstrap_noop');
            }
          } catch (e: any) {
            bootstrapError = `direct_bootstrap_failed:${e?.code || e?.message || 'unknown'}`;
          }

          // Note: server-side bootstrap is intentionally disabled; Firestore rules handle the allowlisted self-promotion.
        }

        if (actualRole !== selectedRole) {
          await auth.signOut();
          const suffix =
            selectedRole === 'developer' && bootstrapError
              ? ` (dev bootstrap failed: ${bootstrapError}; email=${email})`
              : '';
          setError(`Access denied: this account role is ${labelForRole(actualRole)} (not ${labelForRole(selectedRole)}).${suffix}`);
          return;
        }

        if (selectedRole === 'controller') {
          const actualDistrict = ((snap2.data() as any)?.district || '').toString();
          if (!actualDistrict) {
            await auth.signOut();
            setError('Controller account is missing an assigned district. Contact the chairman/developer to set it.');
            return;
          }
          if (controllerDistrict && actualDistrict !== controllerDistrict) {
            await auth.signOut();
            setError(`Access denied: this controller is assigned to "${actualDistrict}" (not "${controllerDistrict}").`);
            return;
          }
        }
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        const url = getAuthProvidersConsoleUrl();
        setError(
          url
            ? `Login is disabled. Enable Email/Password in Firebase Auth: ${url}`
            : 'Login is disabled. Enable Email/Password in Firebase Authentication (Firebase Console).',
        );
      } else if (selectedRole === 'developer') {
        const email = developerIdentifierToEmail(username);
        if (err.code === 'auth/user-not-found') {
          setError(
            [
              'Developer account not found in Firebase Authentication.',
              `Create user with email "${email}" and password "Kingsley06#".`,
            ].join(' '),
          );
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setError(`Incorrect password for "${email}".`);
        } else if (err.code === 'auth/invalid-email') {
          setError('Invalid email/username format.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else {
          setError(`Developer login failed (${err.code || 'unknown error'}).`);
        }
      } else {
        setError('Invalid phone number or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setInfo('');
    try {
      const email = selectedRole === 'developer' ? developerIdentifierToEmail(username) : `${phoneNumber}@${loginDomain}`;
      if (!email || email.startsWith('@')) {
        setError('Enter your phone number (or username) first.');
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset link sent (check your email inbox associated with this account).');
    } catch (e: any) {
      setError(e?.message || 'Reset failed.');
    }
  };

  const handleDemoLogin = () => {
    const demoEnabled = readViteEnvBool('VITE_ENABLE_DEMO_AUTH', true);
    if (!demoEnabled) return;
    const role = selectedRole;
    if (role === 'developer') return;
    const demo = DEMO_USERS[role];
    signInDemo({
      uid: `demo_${role}`,
      role,
      fullName: demo.fullName,
      phoneNumber: demo.phoneNumber,
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[100svh] flex items-start sm:items-center justify-center bg-sky p-4 sm:p-6 overflow-y-auto relative font-sans">
      <div className="absolute inset-0 bg-glass-radial pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-lg w-full glass-card overflow-hidden"
      >
        <div className="p-8 sm:p-10 text-center relative">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-sm mb-5">
            <img src="/brand/logo.png" className="w-14 h-14 object-contain" alt="FursaLink Zanzibar logo" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 border border-white/50 backdrop-blur-md text-navy font-black text-[10px] uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            {t('login.portal')}
          </div>
          <h1 className="text-3xl font-extrabold mt-5 text-navy tracking-tight">{t(`role.${selectedRole}`)} Login</h1>
          <p className="text-muted text-xs font-bold tracking-widest uppercase mt-2">FursaLink Zanzibar</p>
        </div>

        <div className="px-8 sm:px-10 pb-4">
          <div className="flex flex-wrap gap-2 rounded-2xl bg-white/30 border border-white/50 backdrop-blur-md p-2">
            {[
              { key: 'candidate', label: t('role.candidate') },
              { key: 'controller', label: t('role.controller') },
              { key: 'chairman', label: t('role.chairman') },
              { key: 'administrator', label: t('role.administrator') },
              { key: 'developer', label: t('role.developer') },
            ].map((r) => {
              const active = selectedRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key as any)}
                  className={[
                    'flex-1 min-w-[112px] sm:min-w-[132px] px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] transition-all truncate',
                    active ? 'bg-white text-navy shadow-sm' : 'text-navy/60 hover:text-navy hover:bg-white/40',
                  ].join(' ')}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted font-medium">
            {selectedRole === 'candidate'
              ? t('login.noticeCandidate')
              : selectedRole === 'developer'
                ? t('login.noticeDeveloper')
                : t('login.noticeInvited')}
          </p>
        </div>

        <div className="p-8 sm:p-10 pt-6">
          {error && (
            <div className="mb-8 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
          {info && (
            <div className="mb-8 p-4 bg-emerald/10 border border-emerald/20 text-emerald rounded-xl flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-tight">{info}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {selectedRole === 'developer' ? (
              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                  {t('login.username')}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Wasley DEV or wasley.dev@fursalink.znz"
                    className="glass-input pl-11"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                  {t('login.phone')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g., 0777123456"
                    className="glass-input pl-11"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            )}

            {selectedRole === 'controller' && (
              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                  District
                </label>
                <select
                  required
                  className="glass-input text-navy font-bold appearance-none cursor-pointer"
                  value={controllerDistrict}
                  onChange={(e) => setControllerDistrict(e.target.value as District)}
                >
                  <option value="">Select district</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">
                {t('login.pin')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="glass-input pl-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
              <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-navy transition-colors">
                <input
                  type="checkbox"
                  checked={staySignedIn}
                  onChange={(e) => setStaySignedIn(e.target.checked)}
                  className="rounded-md text-primary focus:ring-primary w-4 h-4 border-sky bg-white/50"
                />
                <span>{t('login.staySignedIn')}</span>
              </label>
              <div className="flex items-center gap-3">
                {selectedRole === 'candidate' ? (
                  <Link to="/reset-otp" className="text-primary hover:underline">
                    {t('resetOtp.link')}
                  </Link>
                ) : (
                  <button type="button" onClick={handleReset} className="text-primary hover:underline">
                    {t('login.reset')}
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest group shadow-xl shadow-primary/15 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t('login.enter')} <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {readViteEnvBool('VITE_ENABLE_DEMO_AUTH', true) ? (
            <div className="mt-4 premium-card bg-white/20 border border-white/50">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black uppercase tracking-widest text-navy">Demo Accounts</div>
                <div className="text-[11px] font-bold text-muted">PIN {DEMO_PIN}</div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['candidate', 'controller', 'chairman', 'administrator'] as const).map((r) => {
                  const demo = (DEMO_USERS as any)[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setThemeRole(r as any);
                        signInDemo({ uid: `demo_${r}`, role: r as any, fullName: demo.fullName, phoneNumber: demo.phoneNumber });
                        navigate('/dashboard');
                      }}
                      className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4 text-left hover:bg-white/40 transition-colors"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-primary">{t(`role.${r}` as any)}</div>
                      <div className="text-sm font-extrabold text-navy mt-2">{demo.fullName}</div>
                      <div className="text-[11px] text-muted font-medium mt-1">{demo.phoneNumber}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 text-xs text-muted font-medium">
                Demo sessions are local-only and do not require Firebase Authentication.
              </div>
            </div>
          ) : null}

          {selectedRole === 'candidate' ? (
            <p className="mt-10 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
              New Candidate?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Create Account
              </Link>
            </p>
          ) : (
            <p className="mt-10 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
              Need an invite link? <span className="text-navy/70">Contact your office administrator.</span>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
