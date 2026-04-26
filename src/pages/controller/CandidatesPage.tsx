import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { WARDS } from '../../constants/locations';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';

export default function CandidatesPage() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [ward, setWard] = useState<string>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!profile?.district) return;
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'candidate'), where('district', '==', profile.district), limit(200)),
        );
        setCandidates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profile?.district]);

  const wardOptions = useMemo(() => {
    if (!profile?.district) return [];
    return WARDS[profile.district as any] || [];
  }, [profile?.district]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return candidates.filter((c) => {
      if (ward !== 'all' && (c.ward || '') !== ward) return false;
      if (!needle) return true;
      return (
        (c.fullName || '').toLowerCase().includes(needle) ||
        (c.phoneNumber || '').toLowerCase().includes(needle) ||
        (c.candidateIndex || '').toLowerCase().includes(needle) ||
        (c.occupation || '').toLowerCase().includes(needle) ||
        (c.ward || '').toLowerCase().includes(needle)
      );
    });
  }, [candidates, q, ward]);

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Candidate Directory</h1>
            <p className="text-sm text-muted font-medium">Candidates in {profile?.district}.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading candidates…</div>
        ) : candidates.length === 0 ? (
          <div className="text-sm text-muted italic">No candidates found.</div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex gap-3 flex-wrap">
                <select className="input-field py-2 w-56" value={ward} onChange={(e) => setWard(e.target.value)}>
                  <option value="all">All Wards</option>
                  {wardOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <input className="input-field w-72" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/index/occupation…" />
              </div>
              <div className="text-xs text-muted font-bold uppercase tracking-widest">{filtered.length} results</div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left">
                <thead className="bg-sky/50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Index</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Candidate</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Ward</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">DOB</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Education</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Occupation</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Address</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Email</th>
                    <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-sky/20 transition-colors">
                      <td className="px-6 py-4 text-xs font-black text-navy">{c.candidateIndex || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-sky border border-border overflow-hidden flex items-center justify-center">
                            {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-primary">C</span>}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-navy">{c.fullName}</div>
                            <div className="text-[11px] text-muted font-medium">{c.phoneNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">{c.ward || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted">{c.dob || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted">{c.education || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted">{c.occupation || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted max-w-[240px] truncate">{c.address || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted max-w-[240px] truncate">{c.contactEmail || c.email || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="status-pill status-approved">{c.profileProgress || 0}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
