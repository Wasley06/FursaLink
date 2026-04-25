import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { db } from '../../lib/firebase';
import type { Application, Job, UserProfile } from '../../types';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const [u, j, a] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'jobs')),
          getDocs(collection(db, 'applications')),
        ]);
        setUsers(u.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
        setJobs(j.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
        setApps(a.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const byDistrict = useMemo(() => {
    const map: Record<string, { district: string; candidates: number; jobs: number; applications: number }> = {};
    for (const u of users) {
      const d = u.district || 'Unknown';
      map[d] ||= { district: d, candidates: 0, jobs: 0, applications: 0 };
      if (u.role === 'candidate') map[d].candidates += 1;
    }
    for (const j of jobs) {
      const d = j.district || 'Unknown';
      map[d] ||= { district: d, candidates: 0, jobs: 0, applications: 0 };
      map[d].jobs += 1;
    }
    for (const a of apps) {
      const job = jobs.find((j) => j.id === a.jobId);
      const d = job?.district || 'Unknown';
      map[d] ||= { district: d, candidates: 0, jobs: 0, applications: 0 };
      map[d].applications += 1;
    }
    return Object.values(map).sort((a, b) => b.applications - a.applications).slice(0, 12);
  }, [apps, jobs, users]);

  const byWard = useMemo(() => {
    const map: Record<string, { ward: string; candidates: number }> = {};
    for (const u of users) {
      if (u.role !== 'candidate') continue;
      const w = u.ward || 'Unknown';
      map[w] ||= { ward: w, candidates: 0 };
      map[w].candidates += 1;
    }
    return Object.values(map).sort((a, b) => b.candidates - a.candidates).slice(0, 10);
  }, [users]);

  const byOccupation = useMemo(() => {
    const map: Record<string, { occupation: string; candidates: number }> = {};
    for (const u of users) {
      if (u.role !== 'candidate') continue;
      const o = (u.occupation || 'Unknown').toString();
      map[o] ||= { occupation: o, candidates: 0 };
      map[o].candidates += 1;
    }
    return Object.values(map).sort((a, b) => b.candidates - a.candidates).slice(0, 10);
  }, [users]);

  const jobStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jobs) map[j.status || 'unknown'] = (map[j.status || 'unknown'] || 0) + 1;
    const entries = Object.entries(map).map(([name, value]) => ({ name, value }));
    return entries.sort((a, b) => b.value - a.value);
  }, [jobs]);

  const kpis = useMemo(() => {
    const candidates = users.filter((u) => u.role === 'candidate').length;
    const controllers = users.filter((u) => u.role === 'controller').length;
    const chairmen = users.filter((u) => u.role === 'chairman').length;
    const openJobs = jobs.filter((j) => j.status === 'published').length;
    const pendingApps = apps.filter((a) => a.status === 'pending' || a.status === 'shortlisted').length;
    return { candidates, controllers, chairmen, openJobs, pendingApps };
  }, [apps, jobs, users]);

  const COLORS = ['#0B4F8A', '#1F8A4D', '#D9A441', '#DC2626', '#60A5FA', '#14B8A6', '#F59E0B'];

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Global Analytics</h1>
            <p className="text-sm text-muted font-medium">District overview of candidates, jobs, and applications.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading analytics…</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Candidates', value: kpis.candidates },
                { label: 'Controllers', value: kpis.controllers },
                { label: 'Chairmen', value: kpis.chairmen },
                { label: 'Open Jobs', value: kpis.openJobs },
                { label: 'Pending Apps', value: kpis.pendingApps },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted">{k.label}</div>
                  <div className="text-2xl font-extrabold text-navy mt-2">{k.value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md p-5">
                <div className="text-sm font-extrabold text-navy mb-3">Applications by District</div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byDistrict}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="district" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="applications" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md p-5">
                <div className="text-sm font-extrabold text-navy mb-3">Jobs by Status</div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={jobStatus} dataKey="value" nameKey="name" outerRadius={110} innerRadius={70} paddingAngle={2}>
                        {jobStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md p-5">
                <div className="text-sm font-extrabold text-navy mb-3">Top Wards (Candidates)</div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byWard} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="ward" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="candidates" fill="var(--color-primary)" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md p-5">
                <div className="text-sm font-extrabold text-navy mb-3">Top Occupations (Candidates)</div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byOccupation} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="occupation" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip />
                      <Bar dataKey="candidates" fill="var(--color-primary)" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
