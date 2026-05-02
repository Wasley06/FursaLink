import React, { useEffect, useState } from 'react';
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
import { auth } from '../../lib/firebase';
import { getLiveAppUrl } from '../../lib/liveAppUrl';

type DistrictRow = { district: string; candidates: number; jobs: number; applications: number };
type WardRow = { ward: string; candidates: number };
type OccupationRow = { occupation: string; candidates: number };
type NameValue = { name: string; value: number };

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [byDistrict, setByDistrict] = useState<DistrictRow[]>([]);
  const [byWard, setByWard] = useState<WardRow[]>([]);
  const [byOccupation, setByOccupation] = useState<OccupationRow[]>([]);
  const [jobStatus, setJobStatus] = useState<NameValue[]>([]);
  const [kpis, setKpis] = useState({ candidates: 0, controllers: 0, chairmen: 0, openJobs: 0, pendingApps: 0 });

  useEffect(() => {
    const run = async () => {
      setError('');
      try {
        if (!auth.currentUser) throw new Error('You must be signed in.');
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${getLiveAppUrl()}/api/analytics/global`, {
          method: 'GET',
          headers: { authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = String(body?.detail || body?.error || '').trim();
          if (res.status === 403 || msg.toLowerCase() === 'forbidden') {
            throw new Error('Access denied: Global Analytics is available to Chairman/Developer/Administrator only.');
          }
          throw new Error(msg || 'Failed to load analytics.');
        }
        setKpis(body?.kpis || kpis);
        setByDistrict(Array.isArray(body?.byDistrict) ? body.byDistrict : []);
        setByWard(Array.isArray(body?.byWard) ? body.byWard : []);
        setByOccupation(Array.isArray(body?.byOccupation) ? body.byOccupation : []);
        setJobStatus(Array.isArray(body?.jobStatus) ? body.jobStatus : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const COLORS = ['#0B4F8A', '#1F8A4D', '#D9A441', '#DC2626', '#60A5FA', '#14B8A6', '#F59E0B'];

  const exportPdf = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=980,height=720');
    if (!w) return;
    const brandLogo = `${getLiveAppUrl()}/brand/logo.png`;
    const districtRows = byDistrict
      .map(
        (r) =>
          `<tr><td>${r.district}</td><td style="text-align:right;font-weight:800;">${r.candidates}</td><td style="text-align:right;">${r.jobs}</td><td style="text-align:right;">${r.applications}</td></tr>`,
      )
      .join('');
    w.document.write(`
      <html><head><title>Global Analytics</title><meta charset="utf-8" />
      <style>
        body{font-family:system-ui,Segoe UI,Arial;padding:20px}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:16px}
        .brand img{width:40px;height:40px;object-fit:contain;border-radius:12px;border:1px solid #e5e7eb;background:#fff}
        .brand .t{font-weight:900;letter-spacing:.02em;color:#083B66}
        .sub{color:#64748b;font-size:12px;margin-top:2px}
        h1{margin:0 0 10px}
        .kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:14px 0 18px}
        .kpi{border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;background:#f8fafc}
        .kpi .l{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
        .kpi .v{font-size:18px;font-weight:900;color:#0f172a;margin-top:6px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{padding:10px;border-bottom:1px solid #e2e8f0}
        th{text-align:left;text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:#0b3d91}
      </style>
      </head><body>
        <div class="brand">
          <img src="${brandLogo}" alt="FursaLink" />
          <div>
            <div class="t">FursaLink</div>
            <div class="sub">Global Analytics Export</div>
          </div>
        </div>
        <h1>Global Analytics</h1>
        <div class="kpis">
          <div class="kpi"><div class="l">Candidates</div><div class="v">${kpis.candidates}</div></div>
          <div class="kpi"><div class="l">Controllers</div><div class="v">${kpis.controllers}</div></div>
          <div class="kpi"><div class="l">Chairmen</div><div class="v">${kpis.chairmen}</div></div>
          <div class="kpi"><div class="l">Open Jobs</div><div class="v">${kpis.openJobs}</div></div>
          <div class="kpi"><div class="l">Pending Apps</div><div class="v">${kpis.pendingApps}</div></div>
        </div>
        <h2 style="margin:0 0 10px;font-size:14px;color:#0f172a;">Applications by District</h2>
        <table>
          <thead><tr><th>District</th><th style="text-align:right;">Candidates</th><th style="text-align:right;">Jobs</th><th style="text-align:right;">Applications</th></tr></thead>
          <tbody>${districtRows}</tbody>
        </table>
        <script>window.onload=()=>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  const downloadCsv = () => {
    const header = ['district', 'candidates', 'jobs', 'applications'].join(',');
    const rows = byDistrict.map((r) => [r.district, r.candidates, r.jobs, r.applications].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global_analytics_by_district.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
          <div className="ml-auto">
            <div className="flex items-center gap-2">
              <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={exportPdf} title="Download as PDF (print-to-PDF)">
                Download PDF
              </button>
              <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={downloadCsv} title="Download as CSV">
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading analytics…</div>
        ) : error ? (
          <div className="text-sm text-danger font-bold">{error}</div>
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
