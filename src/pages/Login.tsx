import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Loader2, Lock, Phone, ShieldCheck } from 'lucide-react';
import { labelForRole, normalizeLoginRole, normalizeStoredRole } from '../lib/roles';
import { getAuthProvidersConsoleUrl } from '../lib/firebaseConsole';
import { DEMO_PIN, DEMO_USERS } from '../lib/demoSession';
import { useAuth } from '../contexts/AuthContext';
import { readViteEnvBool, readViteEnv } from '../lib/env';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const selectedRole = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    return normalizeLoginRole(params.role || qp.get('role'));
  }, [location.search, params.role]);

  useEffect(() => {
    setThemeRole(selectedRole);
  }, [selectedRole, setThemeRole]);

  const setRole = (role: 'candidate' | 'controller' | 'chairman' | 'developer') => {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const email = selectedRole === 'developer' ? usernameToEmail(username) : `${phoneNumber}@${loginDomain}`;
      await setPersistence(auth, staySignedIn ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);

      // Enforce role selection (prevents cross-role sign-in).
      const uid = auth.currentUser?.uid;
      if (uid) {
        const snap = await getDoc(doc(db, 'users', uid));
        const actualRole = normalizeStoredRole((snap.data() as any)?.role);
        if (actualRole !== selectedRole) {
          await auth.signOut();
          setError(`Access denied for ${labelForRole(selectedRole)} portal.`);
          return;
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
      const email = selectedRole === 'developer' ? usernameToEmail(username) : `${phoneNumber}@${loginDomain}`;
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
    const demoEnabled = readViteEnvBool('VITE_ENABLE_DEMO_AUTH', import.meta.env.DEV);
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
    <div className="min-h-screen flex items-center justify-center bg-sky p-6 overflow-hidden relative font-sans">
      <div className="absolute inset-0 bg-glass-radial pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full glass-card overflow-hidden"
      >
        <div className="p-10 text-center relative">
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

        <div className="px-10 pb-4">
          <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white/30 border border-white/50 backdrop-blur-md p-2">
            {[
              { key: 'candidate', label: t('role.candidate') },
              { key: 'controller', label: t('role.controller') },
              { key: 'chairman', label: t('role.chairman') },
              { key: 'developer', label: t('role.developer') },
            ].map((r) => {
              const active = selectedRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key as any)}
                  className={[
                    'px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
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
              ? 'New here? Create a candidate account in seconds.'
              : selectedRole === 'developer'
                ? 'Developer accounts are restricted and audited.'
                : 'Controller and Chairman accounts are invitation-only.'}
          </p>
        </div>

        <div className="p-10 pt-6">
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
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Wasley DEV"
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
                <span>Stay Signed In</span>
              </label>
              <button type="button" onClick={handleReset} className="text-primary hover:underline">
                {t('login.reset')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest group shadow-xl shadow-primary/15"
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

          <div className="mt-4">
            {readViteEnvBool('VITE_ENABLE_DEMO_AUTH', import.meta.env.DEV) && selectedRole !== 'developer' && (
              <button
                type="button"
                onClick={handleDemoLogin}
                className="btn-outline w-full justify-center py-3 text-xs font-black uppercase tracking-widest border-white/50 bg-white/30"
              >
                Demo Login (PIN {DEMO_PIN})
              </button>
            )}
          </div>

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
