import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job, Application, UserProfile } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import { motion } from 'motion/react';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Download, 
  Mail, 
  ShieldCheck, 
  Map as MapIcon,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Database,
  Loader2,
  Clock,
  FileCheck,
  AlertCircle as AlertCircleLucide
} from 'lucide-react';
import { cn } from '../lib/utils';
import { seedDemoCandidates } from '../lib/seeder';
import ApprovalsPage from './chairman/ApprovalsPage';
import ApplicationApprovalsPage from './chairman/ApplicationApprovalsPage';
import ChairmanUsersPage from './chairman/UsersPage';
import SecurityPage from './chairman/SecurityPage';
import AnalyticsPage from './chairman/AnalyticsPage';
import ChairmanMessagesPage from './chairman/MessagesPage';
import ChairmanSettingsPage from './chairman/SettingsPage';
import ChairmanCandidatesPage from './chairman/CandidatesPage';
import ChairmanJobsPage from './chairman/JobsPage';
import ChairmanEditJobPage from './chairman/EditJobPage';

const COLORS = ['#0B4F8A', '#1F8A4D', '#D9A441', '#60A5FA', '#14B8A6', '#F59E0B'];

function ExecutiveStats() {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [data, setData] = useState({
    totalApplicants: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    jobs: 0
  });
  const [approvalQueue, setApprovalQueue] = useState<any[]>([]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(query(collection(db, 'users'), where('role', '==', 'candidate'), limit(4000)), (snap) =>
        setData((p) => ({ ...p, totalApplicants: snap.size })),
      ),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'jobs'), where('status', '==', 'published'), limit(4000)), (snap) =>
        setData((p) => ({ ...p, jobs: snap.size })),
      ),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'applications'), where('status', '==', 'approved'), limit(5000)), (snap) =>
        setData((p) => ({ ...p, accepted: snap.size })),
      ),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'applications'), where('status', '==', 'rejected'), limit(5000)), (snap) =>
        setData((p) => ({ ...p, rejected: snap.size })),
      ),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'applications'), where('status', 'in', ['pending', 'shortlisted']), limit(5000)), (snap) =>
        setData((p) => ({ ...p, pending: snap.size })),
      ),
    );

    unsubs.push(
      onSnapshot(query(collection(db, 'approvalRequests'), orderBy('createdAt', 'desc'), limit(10)), (snap) =>
        setApprovalQueue(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  const chartData = [
    { name: 'Mjini', applicants: 4500, approved: 1200 },
    { name: 'Magh A', applicants: 2100, approved: 450 },
    { name: 'Magh B', applicants: 1800, approved: 320 },
    { name: 'Kask A', applicants: 1200, approved: 280 },
    { name: 'Kask B', applicants: 950, approved: 150 },
    { name: 'Kati', applicants: 1100, approved: 520 },
    { name: 'Kusini', applicants: 800, approved: 280 },
  ];

  const occupationData = [
    { name: 'Health', value: 35 },
    { name: 'Education', value: 25 },
    { name: 'IT/ICT', value: 15 },
    { name: 'Admin', value: 10 },
    { name: 'Other', value: 15 },
  ];

  const trendData = [
    { month: 'Jan', count: 400 },
    { month: 'Feb', count: 600 },
    { month: 'Mar', count: 550 },
    { month: 'Apr', count: 900 },
    { month: 'May', count: 1200 },
    { month: 'Jun', count: 1100 },
  ];

  const handleSeed = async () => {
    if (!window.confirm('Seed 300 demo candidates into the database?')) return;
    setSeeding(true);
    try {
      await seedDemoCandidates(300);
      alert('Seeding complete! 300 candidates added.');
    } catch (e) {
      alert('Seeding failed: ' + (e as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy italic">Chairman's Control Center</h1>
          <p className="text-muted font-bold text-[10px] uppercase tracking-[0.2em]">Zanzibar Youth Council | <span className="text-primary">FursaLink AI Engine</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="btn-primary bg-gold hover:bg-warning text-white flex items-center gap-2 border-none shadow-lg shadow-gold/20"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Seed Demo Data
          </button>
          <button onClick={() => window.print()} className="btn-outline bg-white border-border text-navy flex items-center gap-2">
            <Download className="w-5 h-5" /> Export PDF
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Mail className="w-5 h-5" /> Email Reports
          </button>
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {[
          { label: 'Total Candidates', val: data.totalApplicants.toLocaleString(), trend: '↑ 12% vs last month', up: true, icon: Users, color: 'text-primary' },
          { label: 'Approved / Hired', val: data.accepted.toLocaleString(), trend: '↑ 4.2% yield', up: true, icon: ShieldCheck, color: 'text-emerald' },
          { label: 'Rejected', val: data.rejected.toLocaleString(), trend: 'Requires Review', up: false, icon: AlertCircleLucide, color: 'text-danger' },
          { label: 'Pending Review', val: data.pending.toLocaleString(), trend: 'Requires Action', up: true, icon: Clock, color: 'text-warning' },
          { label: 'Open Job Posts', val: data.jobs, trend: '9 expiring soon', up: true, icon: Briefcase, color: 'text-gold' }
        ].map((kpi, i) => {
          const to = i === 0 ? '/chairman/candidates' : i === 4 ? '/chairman/jobs' : '/chairman/approvals';
          return (
          <Link key={i} to={to} className="premium-card hover:bg-sky/20 transition-colors block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg bg-sky/50 ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-navy">{kpi.val}</div>
            <div className={`text-[10px] font-bold mt-2 ${kpi.up ? 'text-emerald' : 'text-danger'}`}>
              {kpi.trend}
            </div>
          </Link>
          );
        })}
      </div>

      <div className="bento-grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-[400px_auto]">
        {/* Registration Trends Chart */}
        <div className="lg:col-span-2 premium-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-bold text-navy flex items-center">
              Hiring Trends 2026 <span className="ai-tag">AI Forecast</span>
            </h3>
            <div className="text-xs text-muted font-medium">Unguja Island Districts</div>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAF4FB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 11}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="count" stroke="#0B4F8A" strokeWidth={3} dot={{ r: 4, fill: '#0B4F8A', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* District Activity - Map Placeholder or Visual */}
        <div
          className="lg:col-span-1 premium-card cursor-pointer hover:bg-sky/20 transition-colors"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/chairman/analytics')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/chairman/analytics');
          }}
          title="Open analytics"
        >
          <h3 className="text-base font-bold text-navy mb-6 text-center">District Activity</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative py-10">
            <div className="w-[120px] h-[180px] bg-sky rounded-[100px_80px_120px_60px] border-2 border-primary/20 relative shadow-inner">
               <div className="absolute top-[20%] left-[40%] w-2 h-2 bg-gold rounded-full border border-white animate-pulse" />
               <div className="absolute top-[50%] left-[30%] w-2 h-2 bg-gold rounded-full border border-white" />
               <div className="absolute top-[70%] left-[50%] w-2 h-2 bg-gold rounded-full border border-white" />
               <div className="absolute top-[40%] left-[60%] w-2 h-2 bg-gold rounded-full border border-white" />
            </div>
            <div className="mt-4 text-xs font-bold text-primary uppercase tracking-widest">Unguja Island View</div>
          </div>
        </div>

        {/* Occupation Distribution / Candidate Mix */}
        <div
          className="lg:col-span-1 premium-card cursor-pointer hover:bg-sky/20 transition-colors"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/chairman/analytics')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/chairman/analytics');
          }}
          title="Open analytics"
        >
          <h3 className="text-base font-bold text-navy mb-6">Candidate Mix</h3>
          <div className="space-y-5">
            {occupationData.slice(0, 3).map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] font-bold mb-2 uppercase tracking-tight text-navy">
                  <span>{d.name}</span>
                  <span>{d.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-sky rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${d.value}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: COLORS[i] }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4 flex items-center justify-center">
             <span className="text-[11px] font-bold text-primary hover:underline">Open analytics</span>
          </div>
        </div>

        {/* Approval Queue Table */}
        <div className="lg:col-span-4 premium-card p-0 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-sky">
            <h3 className="text-base font-bold text-navy">Latest Approval Queue</h3>
            <Link to="/chairman/approvals" className="btn-primary py-1.5 px-4 text-xs rounded-lg">View All Records</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Occupation</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {approvalQueue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-sm text-muted italic">No approval requests.</td>
                  </tr>
                ) : (
                  approvalQueue.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-sky/20 transition-colors cursor-pointer"
                      onClick={() => navigate('/chairman/approvals')}
                      title="Open approvals"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-navy">{row.userId}</td>
                      <td className="px-6 py-4 text-sm text-muted">{row.occupation || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted">{row.district || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn("status-pill", row.status === 'approved' ? 'status-approved' : row.status === 'rejected' ? 'status-rejected' : 'status-pending')}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<ExecutiveStats />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="application-approvals" element={<ApplicationApprovalsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={<ChairmanUsersPage />} />
        <Route path="candidates" element={<ChairmanCandidatesPage />} />
        <Route path="jobs" element={<ChairmanJobsPage />} />
        <Route path="jobs/:jobId/edit" element={<ChairmanEditJobPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="messages" element={<ChairmanMessagesPage />} />
        <Route path="settings" element={<ChairmanSettingsPage />} />
        <Route path="*" element={<ExecutiveStats />} />
      </Routes>
    </DashboardLayout>
  );
}
