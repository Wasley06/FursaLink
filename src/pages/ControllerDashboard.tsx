import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job, Application, UserProfile } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'motion/react';
import JobsPage from './controller/JobsPage';
import EditJobPage from './controller/EditJobPage';
import CandidatesPage from './controller/CandidatesPage';
import ControllerNoticesPage from './controller/NoticesPage';
import ControllerMessagesPage from './controller/MessagesPage';
import ControllerSettingsPage from './controller/SettingsPage';
import ApplicationsPage from './controller/ApplicationsPage';
import { logAudit } from '../lib/audit';
import { 
  Users, 
  Briefcase, 
  FileCheck, 
  Plus, 
  ChevronRight, 
  Filter, 
  MoreHorizontal,
  Clock,
  MapPin,
  Loader2,
  Trash2,
  Edit2
} from 'lucide-react';

function ControllerOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ candidates: 0, jobs: 0, pendingApps: 0 });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;

      // Stats - Filtered by District
      const candQuery = query(collection(db, 'users'), where('role', '==', 'candidate'), where('district', '==', profile.district));
      const jobsQuery = query(collection(db, 'jobs'), where('district', '==', profile.district));
      const appsQuery = query(collection(db, 'applications'), where('status', '==', 'pending'));

      const [cSnap, jSnap, aSnap] = await Promise.all([
        getDocs(candQuery),
        getDocs(jobsQuery),
        getDocs(appsQuery)
      ]);

      setStats({
        candidates: cSnap.size,
        jobs: jSnap.size,
        pendingApps: aSnap.size // In a real app, apps would be filtered by job -> district
      });

      setRecentApplications(aSnap.docs.slice(0, 5).map(d => ({ id: d.id, ...d.data() })));
    };
    fetchData();
  }, [profile]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">District Control Panel</h1>
          <p className="text-muted">Managing <span className="text-primary font-bold">{profile?.district}</span> Recruitment Operations</p>
        </div>
        <div className="flex gap-3">
          <Link to="/controller/jobs/new" className="btn-primary">
            <Plus className="w-5 h-5 mr-1" /> Create Job
          </Link>
          <button className="btn-outline bg-white border-border text-navy">
            <Filter className="w-5 h-5 mr-1" /> Filters
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: 'Total Local Candidates', val: stats.candidates, sub: 'Unguja District', icon: Users, color: 'text-primary' },
          { label: 'Active Recruitment', val: stats.jobs, sub: 'Posted Job Slots', icon: Briefcase, color: 'text-gold' },
          { label: 'Unprocessed Files', val: stats.pendingApps, sub: 'Requires Review', icon: FileCheck, color: 'text-emerald' }
        ].map((stat, i) => (
          <div key={i} className="premium-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{stat.label}</span>
              <div className={`p-1.5 rounded-lg bg-sky/50 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-navy">{stat.val}</div>
            <div className="text-[10px] text-muted mt-1 font-medium">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="bento-grid grid-cols-1 lg:grid-cols-4">
        {/* Recent Applications */}
        <div className="lg:col-span-3 premium-card p-0 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-sky">
            <h3 className="text-base font-bold text-navy">Pending Verification Queue</h3>
            <Link to="/controller/applications" className="text-xs font-bold text-primary hover:underline">Full Queue</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Applicant</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Position</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Submitted</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-sky/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-navy text-sm">Ali Mahmoud</div>
                      <div className="text-[10px] text-muted uppercase font-bold tracking-tight">0777123456</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-navy font-medium">Senior Accountant</td>
                    <td className="px-6 py-4 text-xs text-muted">2h ago</td>
                    <td className="px-6 py-4 text-right">
                       <button className="btn-outline py-1 px-3 text-[10px] rounded-lg">Review File</button>
                    </td>
                  </tr>
                ))}
                {recentApplications.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted italic text-sm">No applications pending review.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Notices */}
        <div className="lg:col-span-1 space-y-5">
          <div className="premium-card bg-navy text-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-[0.2em] opacity-40">System Tools</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link to="/controller/notices" className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                   <span className="text-xs font-bold">New Notice</span>
                   <Plus className="w-4 h-4 text-gold group-hover:rotate-90 transition-transform" />
                </Link>
                <Link to="/controller/ads" className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                   <span className="text-xs font-bold">Upload Ads</span>
                   <Plus className="w-4 h-4 text-emerald group-hover:rotate-90 transition-transform" />
                </Link>
              </div>
            </div>
            <div className="absolute top-[-50%] right-[-30%] w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
          </div>

          <div className="premium-card">
            <h3 className="text-base font-bold text-navy mb-4">Latest Jobs</h3>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-sky rounded-xl border border-sky/50 group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-primary shadow-sm text-xs">J{i}</div>
                    <div className="font-bold text-navy text-[11px] group-hover:text-primary transition-colors truncate w-24">Software Engineer</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-white rounded-md transition-colors"><Edit2 className="w-3 h-3 text-muted" /></button>
                    <button className="p-1.5 hover:bg-danger/10 rounded-md transition-colors"><Trash2 className="w-3 h-3 text-danger" /></button>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/controller/jobs" className="block text-center mt-4 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Manage All Vacancies</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateJob() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    qualifications: '',
    deadline: '',
    occupation: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ref = await addDoc(collection(db, 'jobs'), {
        ...formData,
        district: profile?.district,
        controllerId: profile?.id,
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAudit('job:create', { jobId: ref.id, district: profile?.district });
      navigate('/controller/jobs');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-navy mb-8">Post New Vacancy</h1>
      <form onSubmit={handleSubmit} className="premium-card space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-navy mb-2">Job Title</label>
            <input type="text" required className="input-field" placeholder="e.g., Clinical Officer" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy mb-2">Occupation Group</label>
            <input type="text" required className="input-field" placeholder="Health, Education, IT..." value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-navy mb-2">Detailed Description</label>
          <textarea required rows={4} className="input-field py-3 min-h-[120px]" placeholder="Outline the primary responsibilities..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-bold text-navy mb-2">Required Qualifications</label>
          <textarea required rows={4} className="input-field py-3 min-h-[120px]" placeholder="Degree, 3 years experience, specific certifications..." value={formData.qualifications} onChange={e => setFormData({...formData, qualifications: e.target.value})} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-navy mb-2">Application Deadline</label>
            <input type="date" required className="input-field" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy mb-2">Assigned District</label>
            <input type="text" disabled className="input-field bg-sky border-none font-bold text-primary" value={profile?.district || ''} />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-[2]">
            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Publish Vacancy"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ControllerDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<ControllerOverview />} />
        <Route path="jobs/new" element={<CreateJob />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:jobId/edit" element={<EditJobPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="notices" element={<ControllerNoticesPage />} />
        <Route path="messages" element={<ControllerMessagesPage />} />
        <Route path="settings" element={<ControllerSettingsPage />} />
        <Route path="*" element={<ControllerOverview />} />
      </Routes>
    </DashboardLayout>
  );
}
