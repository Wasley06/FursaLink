import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { BarChart3, LayoutDashboard, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { DISTRICTS, WARDS, type District } from '../../constants/locations';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';
import { cn } from '../../lib/utils';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type AdministratorApproval = {
  id: string;
  userId: string;
  district?: string;
  ward?: string;
  status: ApprovalStatus;
  decidedAt?: any;
  updatedAt?: any;
  createdAt?: any;
};

const DISTRICT_COLORS = [
  '#0EA5E9', // sky
  '#2563EB', // blue
  '#6366F1', // indigo
  '#A855F7', // purple
  '#EC4899', // pink
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#22C55E', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#EF4444', // red
];

function wardColor(i: number, total: number) {
  // Gold-to-orange grade for wards (visually distinct from district palette).
  const t = total <= 1 ? 0 : i / (total - 1);
  const hue = 42 - t * 18; // 42 -> 24
  const sat = 92;
  const light = 70 - t * 28; // 70 -> 42
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function asDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  const n = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isFinite(n) ? new Date(n) : null;
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function AdministratorMetrics({
  title,
  subtitle,
  icon = 'dashboard',
}: {
  title: string;
  subtitle: string;
  icon?: 'dashboard' | 'analytics';
}) {
  const navigate = useNavigate();
  const [district, setDistrict] = useState<District | 'all'>('all');
  const [ward, setWard] = useState<string>('all');
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [approvals, setApprovals] = useState<AdministratorApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const base = collection(db, 'users');
    const qy =
      district === 'all'
        ? query(base, where('role', '==', 'candidate'), limit(2000))
        : query(base, where('role', '==', 'candidate'), where('district', '==', district), limit(2000));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        setCandidates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [district]);

  useEffect(() => {
    setLoading(true);
    const base = collection(db, 'administratorApprovals');
    const qy =
      district === 'all'
        ? query(base, orderBy('updatedAt', 'desc'), limit(2000))
        : query(base, where('district', '==', district), orderBy('updatedAt', 'desc'), limit(2000));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        setApprovals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [district]);

  const wards = useMemo(() => {
    if (district === 'all') return [];
    return WARDS[district] || [];
  }, [district]);

  const filteredCandidates = useMemo(() => {
    if (ward === 'all') return candidates;
    return candidates.filter((c) => (c.ward || '') === ward);
  }, [candidates, ward]);

  const approvalStatusByUser = useMemo(() => {
    const map = new Map<string, ApprovalStatus>();
    const updatedAtByUser = new Map<string, number>();
    for (const a of approvals) {
      const ts = asDate(a.updatedAt || a.decidedAt || a.createdAt);
      const t = ts ? ts.getTime() : 0;
      const prev = updatedAtByUser.get(a.userId) ?? -1;
      if (t >= prev) {
        updatedAtByUser.set(a.userId, t);
        map.set(a.userId, a.status);
      }
    }
    return map;
  }, [approvals]);

  const kpis = useMemo(() => {
    const total = filteredCandidates.length;
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    for (const c of filteredCandidates) {
      const s = approvalStatusByUser.get(c.id);
      if (s === 'approved') approved += 1;
      else if (s === 'rejected') rejected += 1;
      else if (s === 'pending') pending += 1;
    }
    return { total, approved, rejected, pending };
  }, [approvalStatusByUser, filteredCandidates]);

  const rates = useMemo(() => {
    const decided = kpis.approved + kpis.rejected + kpis.pending;
    if (!decided) return { approved: 0, rejected: 0, pending: 0 };
    return {
      approved: Math.round((kpis.approved / decided) * 100),
      rejected: Math.round((kpis.rejected / decided) * 100),
      pending: Math.round((kpis.pending / decided) * 100),
    };
  }, [kpis.approved, kpis.pending, kpis.rejected]);

  const distributionDistrict = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of candidates) {
      const key = (c.district || 'Unknown').toString();
      map.set(key, (map.get(key) || 0) + 1);
    }
    const out = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    out.sort((a, b) => b.value - a.value);
    return out.slice(0, 12);
  }, [candidates]);

  const distributionWard = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredCandidates) {
      const key = (c.ward || 'Unknown').toString();
      map.set(key, (map.get(key) || 0) + 1);
    }
    const out = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    out.sort((a, b) => b.value - a.value);
    return out.slice(0, 12);
  }, [filteredCandidates]);

  const monthlyTrends = useMemo(() => {
    const allowed = new Set(filteredCandidates.map((c) => c.id));
    const map = new Map<string, { approved: number; rejected: number; pending: number }>();
    for (const a of approvals) {
      if (!allowed.has(a.userId)) continue;
      const d = asDate(a.decidedAt || a.updatedAt || a.createdAt);
      if (!d) continue;
      const key = monthKey(d);
      const row = map.get(key) || { approved: 0, rejected: 0, pending: 0 };
      row[a.status] += 1;
      map.set(key, row);
    }
    const keys = Array.from(map.keys()).sort();
    const last12 = keys.slice(-12);
    return last12.map((k) => ({ month: k, ...map.get(k)! }));
  }, [approvals, filteredCandidates]);

  const ratePie = useMemo(
    () => [
      { name: 'Approved', value: rates.approved, color: '#16A34A' },
      { name: 'Rejected', value: rates.rejected, color: '#EF4444' },
      { name: 'Pending', value: rates.pending, color: '#F97316' },
    ],
    [rates.approved, rates.pending, rates.rejected],
  );

  const Icon = icon === 'analytics' ? BarChart3 : LayoutDashboard;

  const goApprovals = (opts?: { status?: ApprovalStatus }) => {
    const qp = new URLSearchParams();
    if (opts?.status) qp.set('status', opts.status);
    if (district !== 'all') qp.set('district', district);
    if (district !== 'all' && ward !== 'all') qp.set('ward', ward);
    const search = qp.toString();
    navigate({ pathname: '/administrator/approvals', search: search ? `?${search}` : '' });
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
            <p className="text-sm text-muted font-medium">{subtitle}</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <select
              className="input-field py-2 w-56"
              value={district}
              onChange={(e) => {
                const next = e.target.value as any;
                setDistrict(next);
                setWard('all');
              }}
            >
              <option value="all">All Districts</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="input-field py-2 w-56"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              disabled={district === 'all'}
            >
              <option value="all">All Wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total candidates', value: kpis.total, icon: BarChart3, tone: 'text-primary', onClick: () => goApprovals() },
          { label: 'Approved candidates', value: kpis.approved, icon: TrendingUp, tone: 'text-emerald', onClick: () => goApprovals({ status: 'approved' }) },
          { label: 'Rejected candidates', value: kpis.rejected, icon: TrendingUp, tone: 'text-danger', onClick: () => goApprovals({ status: 'rejected' }) },
          { label: 'Pending candidates', value: kpis.pending, icon: PieChartIcon, tone: 'text-warning', onClick: () => goApprovals({ status: 'pending' }) },
        ].map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.onClick}
            className={cn('premium-card text-left hover:bg-sky/20 transition-colors cursor-pointer')}
            title="Open approval queue"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">{k.label}</div>
              <div className={cn('p-1.5 rounded-lg bg-sky/50', k.tone)}>
                <k.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-navy">
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                {loading ? '—' : k.value}
              </motion.span>
            </div>
          </button>
        ))}
      </div>

      <div className="bento-grid grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-2 premium-card">
          <div className="text-sm font-extrabold text-navy mb-4">Approval Rates</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={ratePie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  onClick={(d: any) => {
                    const name = String(d?.name || '').toLowerCase();
                    if (name === 'approved' || name === 'rejected' || name === 'pending') goApprovals({ status: name as any });
                  }}
                  className="cursor-pointer"
                >
                  {ratePie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 premium-card">
          <div className="text-sm font-extrabold text-navy mb-4">Monthly Approval Trends</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends} margin={{ top: 10, left: 10, right: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="approved" stroke="#16A34A" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rejected" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pending" stroke="#F97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 premium-card">
          <div className="text-sm font-extrabold text-navy mb-4">Candidate Distribution by District</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distributionDistrict}
                margin={{ top: 10, left: 10, right: 10, bottom: 10 }}
                onClick={(state: any) => {
                  const name = state?.activeLabel;
                  if (!name) return;
                  if ((DISTRICTS as any).includes(name)) {
                    setDistrict(name);
                    setWard('all');
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={55} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {distributionDistrict.map((_, i) => (
                    <Cell key={i} fill={DISTRICT_COLORS[i % DISTRICT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-muted font-medium">Tip: click a bar to filter the dashboard to that district.</div>
        </div>

        <div className="lg:col-span-2 premium-card">
          <div className="text-sm font-extrabold text-navy mb-4">Candidate Distribution by Ward</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distributionWard}
                margin={{ top: 10, left: 10, right: 10, bottom: 10 }}
                onClick={(state: any) => {
                  const name = state?.activeLabel;
                  if (!name || ward === name) return;
                  setWard(String(name));
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={55} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {distributionWard.map((_, i) => (
                    <Cell key={i} fill={wardColor(i, distributionWard.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
