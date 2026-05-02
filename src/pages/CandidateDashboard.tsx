import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Application, Booking, Course, CourseEnrollment, Event, Job, Notice } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'motion/react';
import NoticesPage from './candidate/NoticesPage';
import EventsPage from './candidate/EventsPage';
import CoursesPage from './candidate/CoursesPage';
import MessagesPage from './candidate/MessagesPage';
import SettingsPage from './candidate/SettingsPage';
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
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  XCircle
} from 'lucide-react';

function Overview() {
  const { profile } = useAuth();
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ applied: 0, approved: 0, pending: 0 });
  const [notices, setNotices] = useState<Notice[]>([]);
  const contactEmail = String(profile?.contactEmail || '').trim();
  const hasEmail = contactEmail.includes('@');
  // Verified status is EMAIL-only (phone verification is not used for "Verified ID status").
  const isVerified = hasEmail ? profile?.emailVerified : false;
  const verifyPath = isVerified ? '/candidate/settings' : '/verify-email';

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
        <Link to="/candidate/settings" className="premium-card flex flex-col justify-between min-h-[160px] bg-navy text-white relative overflow-hidden hover:opacity-95 transition-opacity">
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
        </Link>

        <Link to="/candidate/applications" className="premium-card flex flex-col justify-between min-h-[160px] hover:bg-sky/20 transition-colors">
           <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Active Track</div>
              <div className="text-2xl font-extrabold text-navy">{stats.applied} Applications</div>
           </div>
           <div className="flex gap-2">
              <span className="status-pill status-approved text-[10px]">{stats.approved} Approved</span>
              <span className="status-pill status-pending text-[10px]">{stats.pending} Pending</span>
           </div>
        </Link>

        <Link to="/candidate/jobs" className="premium-card flex flex-col justify-between min-h-[160px] border-emerald/20 bg-emerald/5 hover:bg-emerald/10 transition-colors">
           <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald/60 mb-1">Opportunities</div>
              <div className="text-2xl font-extrabold text-navy">{recentJobs.length} New Matches</div>
           </div>
           <div className="text-xs font-bold text-emerald border-b border-emerald/20 pb-0.5 self-start">Explore Job Board</div>
        </Link>
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
           <Link to="/candidate/notices" className="premium-card overflow-hidden relative min-h-[220px] hover:bg-sky/20 transition-colors">
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
              <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary">Open notices</div>
           </Link>

           <Link to={verifyPath} className="premium-card bg-gold/5 border-gold/20 flex flex-col justify-between h-[180px] hover:bg-gold/10 transition-colors">
              <div>
                 <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center text-gold">
                       <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-navy">Verified ID status</h3>
                 </div>
                 <p className="text-[10px] text-muted font-medium italic">Verified profiles are 3x more likely to be shortlisted by agencies.</p>
              </div>
              <span className="btn-primary w-full py-2.5 text-[11px] rounded-xl bg-gold hover:bg-warning shadow-gold/20 border-none transition-all">
                {isVerified ? 'View profile' : hasEmail ? 'Verify email' : 'Add email to verify'}
              </span>
           </Link>
        </div>
      </div>
    </div>
  );
}

function JobBoard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      setLoading(true);
      const q = query(collection(db, 'jobs'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job)));
      setLoading(false);
    };
    run();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy italic">Job Board</h1>
          <p className="text-muted font-medium">Browse published government vacancies and apply instantly.</p>
        </div>
        <Link to="/candidate/applications" className="btn-outline bg-white/40 border-white/50">
          View My Applications <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      {loading ? (
        <div className="premium-card text-center text-muted">Loading jobs…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <Link key={job.id} to={`/candidate/jobs/${job.id}`} className="premium-card hover:translate-y-[-2px] transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">{job.district}</span>
              </div>
              <div className="text-sm font-extrabold text-navy">{job.title}</div>
              <div className="mt-1 text-xs text-muted font-medium">{job.occupation}</div>
              <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3">
                <span className="text-[11px] font-bold text-muted">Open</span>
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
            </Link>
          ))}
          {jobs.length === 0 && <div className="premium-card text-center text-muted">No published jobs yet.</div>}
        </div>
      )}
    </div>
  );
}

function JobDetails() {
  const { profile } = useAuth();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      if (!jobId) return;
      setLoading(true);
      const snap = await getDoc(doc(db, 'jobs', jobId));
      setJob(snap.exists() ? ({ id: snap.id, ...snap.data() } as Job) : null);
      setLoading(false);
    };
    run();
  }, [jobId]);

  const apply = async () => {
    if (!profile || !job) return;
    setSubmitting(true);
    setMessage('');
    try {
      await addDoc(collection(db, 'applications'), {
        jobId: job.id,
        jobTitle: job.title,
        jobDistrict: job.district,
        occupation: job.occupation,
        controllerId: job.controllerId,
        userId: profile.id,
        userName: profile.fullName,
        userPhone: profile.phoneNumber,
        status: 'pending',
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setMessage('Application submitted successfully.');
      setTimeout(() => navigate('/candidate/applications'), 600);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="premium-card text-center text-muted">Loading job…</div>;
  if (!job) return <div className="premium-card text-center text-muted">Job not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="premium-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted">Vacancy</div>
            <h1 className="text-3xl font-extrabold text-navy mt-2">{job.title}</h1>
            <p className="text-sm text-muted font-medium mt-1">{job.occupation} • {job.district}</p>
          </div>
          <button onClick={apply} disabled={submitting} className="btn-primary px-8 py-3 text-xs font-black uppercase tracking-widest">
            {submitting ? 'Submitting…' : 'Apply Now'}
          </button>
        </div>
        {message && <div className="mt-4 text-sm font-bold text-primary">{message}</div>}
      </div>

      <div className="premium-card">
        <h3 className="text-base font-extrabold text-navy mb-3">Description</h3>
        <p className="text-sm text-muted whitespace-pre-wrap">{job.description}</p>
      </div>

      <div className="premium-card">
        <h3 className="text-base font-extrabold text-navy mb-3">Qualifications</h3>
        <p className="text-sm text-muted whitespace-pre-wrap">{job.qualifications}</p>
      </div>
    </div>
  );
}

function ApplicationsPage() {
  const { profile } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      setLoading(true);
      const q = query(collection(db, 'applications'), where('userId', '==', profile.id), orderBy('appliedAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    run();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy italic">My Applications</h1>
          <p className="text-muted font-medium">Track approvals, rejections, and chairman decisions.</p>
        </div>
        <Link to="/candidate/jobs" className="btn-primary px-6 py-3 text-xs font-black uppercase tracking-widest">
          Apply to Jobs <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      {loading ? (
        <div className="premium-card text-center text-muted">Loading applications…</div>
      ) : (
        <div className="premium-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Job</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-navy">{a.jobTitle || a.jobId}</td>
                    <td className="px-6 py-4 text-sm text-muted">{a.jobDistrict || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`status-pill ${a.status === 'approved' ? 'status-approved' : a.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                        {String(a.status || 'pending')}
                      </span>
                      {a.chairmanStatus && (
                        <span className={`ml-2 status-pill ${a.chairmanStatus === 'approved' ? 'status-approved' : a.chairmanStatus === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                          chairman: {String(a.chairmanStatus)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {apps.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-sm text-muted italic" colSpan={3}>
                      No applications yet. Open the Job Board and apply.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CoursesAndEvents() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, boolean>>({});
  const [bookings, setBookings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const run = async () => {
      const [cSnap, eSnap] = await Promise.all([
        getDocs(query(collection(db, 'courses'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(50))),
        getDocs(query(collection(db, 'events'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(50))),
      ]);
      setCourses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
      setEvents(eSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));

      if (profile) {
        const [enSnap, bSnap] = await Promise.all([
          getDocs(query(collection(db, 'courseEnrollments'), where('userId', '==', profile.id), limit(200))),
          getDocs(query(collection(db, 'bookings'), where('userId', '==', profile.id), limit(200))),
        ]);
        const enMap: Record<string, boolean> = {};
        enSnap.docs.forEach((d) => (enMap[(d.data() as any).courseId] = true));
        setEnrollments(enMap);
        const bMap: Record<string, boolean> = {};
        bSnap.docs.forEach((d) => (bMap[(d.data() as any).eventId] = true));
        setBookings(bMap);
      }
    };
    run();
  }, [profile]);

  const enroll = async (courseId: string) => {
    if (!profile) return;
    await addDoc(collection(db, 'courseEnrollments'), {
      userId: profile.id,
      courseId,
      status: 'enrolled',
      createdAt: serverTimestamp(),
    } as Omit<CourseEnrollment, 'id'>);
    setEnrollments((p) => ({ ...p, [courseId]: true }));
  };

  const book = async (eventId: string) => {
    if (!profile) return;
    await addDoc(collection(db, 'bookings'), {
      userId: profile.id,
      eventId,
      status: 'booked',
      createdAt: serverTimestamp(),
    } as Omit<Booking, 'id'>);
    setBookings((p) => ({ ...p, [eventId]: true }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-navy italic">Government Courses & Programs</h1>
        <p className="text-muted font-medium">Enroll in courses and book seminars/campaigns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-navy flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Courses
            </h3>
          </div>
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-navy truncate">{c.title}</div>
                  <div className="text-xs text-muted font-medium truncate">{c.category}</div>
                </div>
                {enrollments[c.id] ? (
                  <span className="inline-flex items-center gap-1 text-emerald text-xs font-black uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Enrolled
                  </span>
                ) : (
                  <button onClick={() => enroll(c.id)} className="btn-primary py-2 px-4 text-xs font-black uppercase tracking-widest">
                    Enroll
                  </button>
                )}
              </div>
            ))}
            {courses.length === 0 && <div className="text-sm text-muted italic">No published courses yet.</div>}
          </div>
        </div>

        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-navy flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Seminars & Campaigns
            </h3>
          </div>
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-navy truncate">{ev.title}</div>
                  <div className="text-xs text-muted font-medium truncate">{ev.type.toUpperCase()} • {ev.location || 'Zanzibar'}</div>
                </div>
                {bookings[ev.id] ? (
                  <span className="inline-flex items-center gap-1 text-emerald text-xs font-black uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Booked
                  </span>
                ) : (
                  <button onClick={() => book(ev.id)} className="btn-outline bg-white/40 border-white/50 py-2 px-4 text-xs font-black uppercase tracking-widest">
                    Book
                  </button>
                )}
              </div>
            ))}
            {events.length === 0 && <div className="text-sm text-muted italic">No published seminars/campaigns yet.</div>}
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
        <Route path="jobs" element={<JobBoard />} />
        <Route path="jobs/:jobId" element={<JobDetails />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </DashboardLayout>
  );
}
