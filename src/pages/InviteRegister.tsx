import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, KeyRound, Loader2, Lock, Phone, ShieldCheck, User } from 'lucide-react';
import { getAuthProvidersConsoleUrl } from '../lib/firebaseConsole';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_PIN, DEMO_USERS } from '../lib/demoSession';
import { readViteEnv, readViteEnvBool } from '../lib/env';
import { useTheme } from '../contexts/ThemeContext';

type InviteRole = 'controller' | 'chairman' | 'developer';

function normalizeInviteRole(role?: string): InviteRole | null {
  if (role === 'controller') return 'controller';
  if (role === 'chairman' || role === 'admin') return 'chairman';
  if (role === 'developer' || role === 'dev') return 'developer';
  return null;
}

function expectedRoleCode(role: InviteRole) {
  const raw =
    role === 'controller'
      ? (import.meta as any).env?.VITE_INVITE_CONTROLLER_CODE
      : role === 'chairman'
        ? (import.meta as any).env?.VITE_INVITE_CHAIRMAN_CODE
        : (import.meta as any).env?.VITE_INVITE_DEVELOPER_CODE;
  return typeof raw === 'string' ? raw : '';
}

export default function InviteRegister() {
  const params = useParams();
  const inviteRole = normalizeInviteRole(params.role);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signInDemo } = useAuth();
  const { setThemeRole } = useTheme();

  const inviteCodeFromUrl = searchParams.get('code') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    inviteCode: inviteCodeFromUrl,
    password: '',
    confirmPassword: '',
  });

  const roleLabel = useMemo(() => {
    if (inviteRole === 'controller') return 'Controller';
    if (inviteRole === 'chairman') return 'Chairman';
    if (inviteRole === 'developer') return 'Developer';
    return 'Officer';
  }, [inviteRole]);

  React.useEffect(() => {
    if (inviteRole) setThemeRole(inviteRole);
  }, [inviteRole, setThemeRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteRole) return;
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const expectedCode = expectedRoleCode(inviteRole);
    if (!expectedCode) {
      setError(
        'Invite registration is not configured. Set VITE_INVITE_CONTROLLER_CODE / VITE_INVITE_CHAIRMAN_CODE / VITE_INVITE_DEVELOPER_CODE.',
      );
      return;
    }
    if (formData.inviteCode.trim() !== expectedCode.trim()) {
      setError('Invalid invite code for this link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const domain = readViteEnv('VITE_LOGIN_EMAIL_DOMAIN') || 'fursalink.znz';
      const email = `${formData.phoneNumber}@${domain}`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      const user = userCredential.user;

      const role = inviteRole === 'controller' ? 'controller' : inviteRole === 'chairman' ? 'chairman' : 'developer';

      await setDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        role,
        profileProgress: 100,
        inviteRole: inviteRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        const url = getAuthProvidersConsoleUrl();
        setError(
          url
            ? `Registration is disabled. Enable Email/Password in Firebase Auth: ${url}`
            : 'Registration is disabled. Enable Email/Password in Firebase Authentication (Firebase Console).',
        );
      } else {
        setError(err.message || 'Registration failed. Try a different phone number.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCreate = () => {
    if (!inviteRole) return;
    const demoEnabled = readViteEnvBool('VITE_ENABLE_DEMO_AUTH', import.meta.env.DEV);
    if (!demoEnabled) return;
    if (inviteRole === 'developer') return;
    const demoKey = inviteRole === 'controller' ? 'controller' : 'chairman';
    const demo = DEMO_USERS[demoKey];
    signInDemo({ uid: `demo_${demoKey}`, role: demoKey as any, fullName: demo.fullName, phoneNumber: demo.phoneNumber });
    navigate('/dashboard');
  };

  if (!inviteRole) {
    return (
      <div className="min-h-screen bg-sky p-6 flex items-center justify-center">
        <div className="max-w-md w-full glass-card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-danger" />
          </div>
          <h1 className="text-xl font-extrabold text-navy mb-2">Invalid invitation link</h1>
          <p className="text-sm text-muted font-medium mb-6">Ask your office administrator to resend the correct link.</p>
          <Link to="/login" className="btn-primary w-full justify-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky p-6 flex items-center justify-center relative overflow-hidden font-sans">
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
            Invite-only Officer Registration
          </div>
          <h1 className="text-3xl font-extrabold mt-5 text-navy tracking-tight">
            {roleLabel} Access
          </h1>
          <p className="text-muted text-xs font-bold tracking-widest uppercase mt-2">
            Use your invitation code to activate
          </p>
        </div>

        <div className="p-10 pt-0">
          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-tight break-words">{error}</p>
                {error.includes('Enable Email/Password') && (
                  <button
                    type="button"
                    onClick={handleDemoCreate}
                    className="mt-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Create Demo {roleLabel} (PIN {DEMO_PIN})
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2 ml-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  name="fullName"
                  required
                  className="glass-input pl-11"
                  placeholder="e.g., Asha Ali"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2 ml-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  name="phoneNumber"
                  type="tel"
                  required
                  className="glass-input pl-11"
                  placeholder="e.g., 0777123456"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2 ml-1">
                Invitation Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  name="inviteCode"
                  required
                  className="glass-input pl-11 font-extrabold tracking-wider"
                  placeholder="Enter code"
                  value={formData.inviteCode}
                  onChange={handleChange}
                />
              </div>
              <p className="text-xs text-muted font-medium mt-2">
                This code is unique to your office role and is required to register.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2 ml-1">
                  Access Pin
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    name="password"
                    type="password"
                    required
                    className="glass-input pl-11"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-navy/50 uppercase tracking-widest mb-2 ml-1">
                  Confirm Pin
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    className="glass-input pl-11"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
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
                  Activate Account <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
            Already have access?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
