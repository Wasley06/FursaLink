import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { DISTRICTS, WARDS, District } from '../constants/locations';
import { User, Phone, Lock, UserPlus, ArrowRight, Loader2, MapPin, Briefcase, AlertCircle } from 'lucide-react';
import { getAuthProvidersConsoleUrl } from '../lib/firebaseConsole'; 
import { useAuth } from '../contexts/AuthContext'; 
import { DEMO_PIN, DEMO_USERS } from '../lib/demoSession'; 
import { readViteEnv, readViteEnvBool } from '../lib/env';
import { useTheme } from '../contexts/ThemeContext';
import { buildCandidateIndex } from '../lib/candidateIndex';
import { uploadUserFile } from '../lib/uploads';
import { sendNotification } from '../lib/notify';
import { ensureCandidateReference } from '../lib/candidateReference';

export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingAccount, setExistingAccount] = useState(false);
  const navigate = useNavigate(); 
  const { signInDemo } = useAuth(); 
  const { setThemeRole } = useTheme();

  React.useEffect(() => {
    setThemeRole('candidate');
  }, [setThemeRole]);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'male',
    district: '' as District | '',
    ward: '',
    education: '',
    occupation: '',
    address: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const ageForDob = (dob?: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'district') setFormData(prev => ({ ...prev, ward: '' }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setExistingAccount(false);
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.contactEmail || !formData.contactEmail.includes('@')) {
      setError('Email address is required for verification.');
      return;
    }
    const age = ageForDob(formData.dob);
    if (age == null) {
      setError('Invalid date of birth.');
      return;
    }
    if (age > 35) {
      setError('Maximum age allowed is 35.');
      return;
    }
    if (!photoFile) {
      setError('Profile photo is required.');
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem('fursalink:pendingPhone', formData.phoneNumber);
      localStorage.setItem('fursalink:pendingEmail', formData.contactEmail);
      const domain = readViteEnv('VITE_LOGIN_EMAIL_DOMAIN') || 'fursalink.znz';
      const email = `${formData.phoneNumber}@${domain}`;  
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);  
      const user = userCredential.user;  
 
      // Create profile in Firestore 
      await setDoc(doc(db, 'users', user.uid), { 
        fullName: formData.fullName, 
        email,
        contactEmail: formData.contactEmail || '',
        phoneNumber: formData.phoneNumber, 
        role: 'candidate', 
        dob: formData.dob, 
        gender: formData.gender, 
        district: formData.district, 
        ward: formData.ward, 
        education: formData.education, 
        occupation: formData.occupation, 
        address: formData.address || '',
        tinNumber: '',
        photoUrl: '',
        photoRef: null,
        idRef: null,
        cvRef: null,
        certificatesRef: null,
        tinRef: null,
        shehaLetterRef: null,
        profileProgress: 50, 
        phoneVerified: false,
        emailVerified: false,
        candidateIndex: buildCandidateIndex({ district: formData.district, ward: formData.ward, uid: user.uid }),
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(), 
      }); 

      // Profile photo (required)
      const up = await uploadUserFile({ uid: user.uid, file: photoFile, kind: 'profile', nameHint: 'candidate-photo' });
      await updateDoc(doc(db, 'users', user.uid), {
        photoUrl: up.url || '',
        photoRef: up.ref,
        updatedAt: serverTimestamp(),
      } as any);

      // Allocate the official reference format (FZ-DIST-WARD-00001) via server-side counter.
      // Best-effort; does not block registration if the device is offline.
      try {
        await ensureCandidateReference();
      } catch {
        // ignore
      }

      // Notify district controller(s) so the new candidate appears instantly in their workflow.
      try {
        const controllers = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'controller'), where('district', '==', formData.district), limit(10)),
        );
        await Promise.all(
          controllers.docs.map((d) =>
            sendNotification({
              recipientId: d.id,
              title: 'New candidate registered',
              message: `${formData.fullName} (${formData.phoneNumber}) â€¢ ${formData.ward || ''}`,
              targetPath: '/controller/candidates',
            }),
          ),
        );
      } catch {
        // Never block registration on notifications.
      }
 
      navigate(`/verify-email?email=${encodeURIComponent(formData.contactEmail)}`, { replace: true });
    } catch (err: any) { 
      console.error(err); 
      if (err?.code === 'auth/email-already-in-use') {
        setExistingAccount(true);
        setError('This phone number is already registered. Please login instead.');
        return;
      }
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
    const demoEnabled = readViteEnvBool('VITE_ENABLE_DEMO_AUTH', true);
    if (!demoEnabled) return;
    const demo = DEMO_USERS.candidate; 
    signInDemo({ uid: 'demo_candidate', role: 'candidate', fullName: demo.fullName, phoneNumber: demo.phoneNumber }); 
    navigate('/candidate'); 
  }; 

  return (
    <div className="min-h-screen bg-sky py-20 px-6 flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-glass-radial pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full glass-card overflow-hidden"
      >
        <div className="px-10 py-10 relative">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gold" />
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Registration</div>
            </div>
            <div className="flex gap-1">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1 w-8 rounded-full transition-all ${step >= s ? 'bg-gold' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-sm">
                <img src="/brand/logo.png" className="w-10 h-10 object-contain" alt="FursaLink Zanzibar logo" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-1 italic text-navy">Join FursaLink</h1>
                <p className="text-muted text-[10px] font-bold tracking-[0.2em] uppercase">Gateway to Govt Opportunities</p>
              </div>
            </div>
          </div>
          <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        </div>

        <form onSubmit={handleRegister} className="p-10 pt-12">
          {error && (
            <div className="mb-8 p-4 bg-danger/5 border border-danger/10 text-danger rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-tight break-words">{error}</p>
                {error.includes('Enable Email/Password') && (
                  <button
                    type="button"
                    onClick={handleDemoCreate}
                    className="mt-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Create Demo Candidate (PIN {DEMO_PIN})
                  </button>
                )}
                {existingAccount && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/login?role=candidate&phone=${encodeURIComponent(formData.phoneNumber)}`, { replace: true })
                    }
                    className="mt-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Go to Login
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-2">
                <label className="cursor-pointer select-none">
                  <div className="w-36 h-36 rounded-[28px] border-2 border-dashed border-primary/25 bg-white/25 backdrop-blur-md flex flex-col items-center justify-center gap-2 hover:bg-white/35 transition">
                    <div className="w-12 h-12 rounded-2xl bg-white/60 border border-white/70 flex items-center justify-center overflow-hidden">
                      {photoFile ? (
                        <img src={URL.createObjectURL(photoFile)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-navy/70">Upload Profile</div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-primary/80">Personal Information</div>
                <div className="mt-3 h-px bg-white/50" />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input type="text" name="fullName" required className="glass-input pl-11" placeholder="Ali Haji" value={formData.fullName} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input type="email" name="contactEmail" required className="glass-input pl-11" placeholder="you@example.com" value={formData.contactEmail} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input type="tel" name="phoneNumber" required className="glass-input pl-11" placeholder="077xxxxxxx" value={formData.phoneNumber} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <input type="password" name="password" required className="glass-input" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Verify Password</label>
                  <input type="password" name="confirmPassword" required className="glass-input" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Date of Birth</label>
                  <input type="date" name="dob" required className="glass-input" value={formData.dob} onChange={handleChange} />
                </div>
                <div className="rounded-xl border border-sky bg-sky/30 p-4">
                  <div className="text-[10px] font-black text-navy/40 uppercase tracking-widest mb-1">Account Type</div>
                  <div className="text-sm font-extrabold text-navy">Candidate Registration</div>
                  <p className="mt-1 text-xs text-muted font-medium">
                    Controller and Chairman accounts are created via invitation link.
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <button type="button" onClick={() => setStep(2)} className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest group shadow-xl shadow-primary/10">
                  Step 02 <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">District</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted z-10" />
                    <select name="district" required className="glass-input pl-11 text-navy font-bold appearance-none cursor-pointer" value={formData.district} onChange={handleChange}>
                      <option value="">Select</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Shehia (Ward)</label>
                  <select name="ward" required className="glass-input text-navy font-bold appearance-none cursor-pointer" value={formData.ward} disabled={!formData.district} onChange={handleChange}>
                    <option value="">Select</option>
                    {formData.district && (WARDS as any)[formData.district]?.map((w: string) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Address</label>
                <input
                  type="text"
                  name="address"
                  required
                  className="glass-input"
                  placeholder="e.g., Mkele, Zanzibar"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Education Level</label>
                <select name="education" required className="glass-input text-navy font-bold appearance-none cursor-pointer" value={formData.education} onChange={handleChange}>
                  <option value="">Select Highest Level</option>
                  <option value="none">None</option>
                  <option value="primary">Primary School</option>
                  <option value="secondary">Secondary School</option>
                  <option value="diploma">Diploma</option>
                  <option value="degree">Bachelor's Degree</option>
                  <option value="masters">Master's Degree</option>
                  <option value="phd">PhD</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Desired Position</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" name="occupation" required className="glass-input pl-11" placeholder="e.g., Clinical Officer" value={formData.occupation} onChange={handleChange} />
                </div>
              </div>

              <div>
                <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-navy/50">Required Documents</div>
                  <div className="mt-1 text-sm font-extrabold text-navy">Complete after registration</div>
                  <p className="mt-1 text-xs text-muted font-medium">
                    Zanzibar/National ID, CV, Certificates, TIN, and Sheha letter are uploaded in <span className="font-bold text-navy">Profile Settings</span> after you create your account.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1 py-4 text-[11px] font-black uppercase tracking-widest border-sky">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-[2] py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/10">
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Complete Account"}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="p-8 text-center text-[11px] font-bold uppercase tracking-widest text-muted bg-sky/30 border-t border-sky/50">
          Existing Member? {' '}
          <Link to="/login" className="text-primary hover:underline">Access Portal</Link>
        </p>
      </motion.div>
    </div>
  );
}
