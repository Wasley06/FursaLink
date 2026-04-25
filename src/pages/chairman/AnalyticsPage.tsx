import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar } from 'recharts';
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
          <div className="h-[340px]">
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
        )}
      </div>
    </div>
  );
}

