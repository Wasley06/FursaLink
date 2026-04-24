import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job, Application, Notice } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'motion/react';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  TrendingUp, 
  Star,
  ChevronRight,
  ArrowRight,
  Megaphone,
  Bell
} from 'lucide-react';

function Overview() {
  const { profile } = useAuth();
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ applied: 0, approved: 0, pending: 0 });
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch stats
      const appsQuery = query(collection(db, 'applications'), where('userId', '==', profile?.id));
      const appsSnap = await getDocs(appsQuery);
      const apps = appsSnap.docs.map(d => d.data());
      setStats({
        applied: apps.length,
        approved: apps.filter(a => a.status === 'approved').length,
        pending: apps.filter(a => a.status === 'pending').length
      });

      // Fetch recommended jobs (matching occupation)
      const jobsQuery = query(
        collection(db, 'jobs'), 
        where('status', '==', 'published'),
        where('occupation', '==', profile?.occupation),
        limit(3)
      );
      const jobsSnap = await getDocs(jobsQuery);
      setRecentJobs(jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));

      // Fetch notices
      const noticesQuery = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(3));
      const noticesSnap = await getDocs(noticesQuery);
      setNotices(noticesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
    };
    if (profile) fetchData();
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="premium-card flex flex-col justify-between min-h-[160px] bg-navy text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Account Health</div>
            <div className="text-2xl font-extrabold text-white">Profile: {profile?.profileProgress}%</div>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${profile?.profileProgress || 0}%` }} className="h-full bg-gold rounded-full" />
            </div>
            <p className="text-[10px] text-white/60 font-medium">Complete your profile to unlock <span className="text-gold">AI Smart Match</span></p>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
        </div>

        <div className="premium-card flex flex-col justify-between min-h-[160px]">
           <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Active Track</div>
              <div className="text-2xl font-extrabold text-navy">{stats.applied} Applications</div>
           </div>
           <div className="flex gap-2">
              <span className="status-pill status-approved text-[10px]">{stats.approved} Approved</span>
              <span className="status-pill status-pending text-[10px]">{stats.pending} Pending</span>
           </div>
        </div>

        <div className="premium-card flex flex-col justify-between min-h-[160px] border-emerald/20 bg-emerald/5">
           <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald/60 mb-1">Opportunities</div>
              <div className="text-2xl font-extrabold text-navy">{recentJobs.length} New Matches</div>
           </div>
           <Link to="/candidate/jobs" className="text-xs font-bold text-emerald border-b border-emerald/20 pb-0.5 self-start hover:border-emerald transition-all">Explore Job Board</Link>
        </div>
      </div>

      <div className="bento-grid grid-cols-1 lg:grid-cols-3">
        {/* Jobs for You */}
        <div className="lg:col-span-2 space-y-5">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-bold text-navy flex items-center">
                Smart Matches for You <span className="ai-tag ml-3 italic">AI Ranking</span>
              </h3>
              <div className="flex gap-2">
                 <button className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-sky"><TrendingUp className="w-4 h-4 text-muted" /></button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentJobs.map((job) => (
                <Link to={`/candidate/jobs/${job.id}`} key={job.id} className="premium-card group hover:translate-y-[-2px] transition-all cursor-pointer">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-sky rounded-xl flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                        {job.title[0]}
                      </div>
                      <div className="text-[10px] font-black text-emerald uppercase tracking-tighter bg-emerald/10 px-2 py-0.5 rounded-full">Top Match</div>
                   </div>
                   <h4 className="font-bold text-navy text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{job.title}</h4>
                   <p className="text-[11px] text-muted font-medium mb-4">{job.department || 'Gov Dept'} • {job.district}</p>
                   <div className="flex items-center justify-between pt-3 border-t border-sky">
                      <span className="text-[11px] font-bold text-navy">{job.salary || 'Competitive'}</span>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-1 transition-transform" />
                   </div>
                </Link>
              ))}
              {recentJobs.length === 0 && (
                <div className="col-span-2 premium-card text-center py-10 text-muted italic text-sm">No specific matches yet. Try updating your profile.</div>
              )}
           </div>
        </div>

        {/* Support & Notices */}
        <div className="lg:col-span-1 space-y-5">
           <div className="premium-card overflow-hidden relative min-h-[220px]">
              <h3 className="text-base font-bold text-navy mb-4 relative z-10">Gov Announcements</h3>
              <div className="space-y-4 relative z-10">
                 {notices.map(notice => (
                   <div key={notice.id} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                      <div>
                         <div className="text-xs font-bold text-navy leading-snug line-clamp-2">{notice.title}</div>
                         <div className="text-[10px] text-muted mt-1 uppercase font-bold">Latest Update</div>
                      </div>
                   </div>
                 ))}
                 {notices.length === 0 && (
                   <p className="text-xs text-muted italic">No active notices.</p>
                 )}
              </div>
           </div>

           <div className="premium-card bg-gold/5 border-gold/20 flex flex-col justify-between h-[180px]">
              <div>
                 <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center text-gold">
                       <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-navy">Verified ID status</h3>
                 </div>
                 <p className="text-[10px] text-muted font-medium italic">Verified profiles are 3x more likely to be shortlisted by agencies.</p>
              </div>
              <button className="btn-primary w-full py-2.5 text-[11px] rounded-xl bg-gold hover:bg-warning shadow-gold/20 border-none transition-all">Upgrade Profile</button>
           </div>
        </div>
      </div>
    </div>
  );
}

export default function CandidateDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<Overview />} />
        {/* Other sub-routes can be added here */}
        <Route path="jobs" element={<div className="premium-card">Job List Coming Soon...</div>} />
        <Route path="applications" element={<div className="premium-card">My Applications Coming Soon...</div>} />
        <Route path="settings" element={<div className="premium-card">Profile Settings Coming Soon...</div>} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </DashboardLayout>
  );
}
