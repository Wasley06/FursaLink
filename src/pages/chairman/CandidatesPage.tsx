import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Users } from 'lucide-react';
import { DISTRICTS, WARDS, type District } from '../../constants/locations';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';

export default function ChairmanCandidatesPage() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<District | 'all'>('all');
  const [ward, setWard] = useState<string>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const base = collection(db, 'users');
        const snap =
          district === 'all'
            ? await getDocs(query(base, where('role', '==', 'candidate'), limit(800)))
            : await getDocs(query(base, where('role', '==', 'candidate'), where('district', '==', district), limit(800)));
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [district]);

  const wards = useMemo(() => {
    if (district === 'all') return [];
    return WARDS[district] || [];
  }, [district]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((c) => {
      if (ward !== 'all' && (c.ward || '') !== ward) return false;
      if (!needle) return true;
      return (
        (c.fullName || '').toLowerCase().includes(needle) ||
        (c.phoneNumber || '').toLowerCase().includes(needle) ||
        (c.candidateIndex || '').toLowerCase().includes(needle) ||
        (c.occupation || '').toLowerCase().includes(needle) ||
        (c.district || '').toLowerCase().includes(needle) ||
        (c.ward || '').toLowerCase().includes(needle)
      );
    });
  }, [items, q, ward]);

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">Candidate Directory</h1>
            <p className="text-sm text-muted font-medium">Search candidates across districts and wards.</p>
          </div>
          <input className="input-field w-72" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/index/occupation…" />
        </div>
      </div>

      <div className="premium-card">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-3 flex-wrap">
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
            <select className="input-field py-2 w-56" value={ward} onChange={(e) => setWard(e.target.value)} disabled={district === 'all'}>
              <option value="all">All Wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted font-bold uppercase tracking-widest">{filtered.length} results</div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-muted font-medium">Loading candidates…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted italic">No candidates found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-sky/50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Index</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Name</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District / Ward</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Occupation</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky">
                  {filtered.slice(0, 500).map((c) => (
                    <tr key={c.id} className="hover:bg-sky/20 transition-colors">
                      <td className="px-6 py-4 text-xs font-black text-navy">{c.candidateIndex || '-'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-navy">{c.fullName}</td>
                      <td className="px-6 py-4 text-sm text-muted">
                        {c.district || '-'} / {c.ward || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">{c.occupation || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="status-pill status-approved">{c.profileProgress || 0}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

