import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { DISTRICTS, WARDS, District } from '../constants/locations';
import { User, Phone, Lock, UserPlus, ArrowRight, Loader2, MapPin, Briefcase, AlertCircle } from 'lucide-react';
import { getAuthProvidersConsoleUrl } from '../lib/firebaseConsole';

export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'male',
    district: '' as District | '',
    ward: '',
    education: '',
    occupation: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'district') setFormData(prev => ({ ...prev, ward: '' }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const email = `${formData.phoneNumber}@fursalink.znz`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      const user = userCredential.user;

      // Create profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        role: 'candidate',
        dob: formData.dob,
        gender: formData.gender,
        district: formData.district,
        ward: formData.ward,
        education: formData.education,
        occupation: formData.occupation,
        profileProgress: 50,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate('/candidate');
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
              <p className="text-[11px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-1 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input type="text" name="fullName" required className="glass-input pl-11" placeholder="Ali Haji" value={formData.fullName} onChange={handleChange} />
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
