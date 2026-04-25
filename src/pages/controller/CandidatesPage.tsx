import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';

export default function CandidatesPage() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Name</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Phone</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Occupation</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-navy">{c.fullName}</td>
                    <td className="px-6 py-4 text-sm text-muted">{c.phoneNumber}</td>
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
  );
}

