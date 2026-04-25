import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { Users } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { StoredUserRole, UserProfile } from '../../types';

export default function ChairmanUsersPage() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(300)));
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((u) => {
      return (
        (u.fullName || '').toLowerCase().includes(needle) ||
        (u.phoneNumber || '').toLowerCase().includes(needle) ||
        (u.role || '').toLowerCase().includes(needle) ||
        (u.district || '').toLowerCase().includes(needle)
      );
    });
  }, [items, q]);

  const setRole = async (userId: string, role: StoredUserRole) => {
    await updateDoc(doc(db, 'users', userId), { role, updatedAt: serverTimestamp() } as any);
    setItems((p) => p.map((u) => (u.id === userId ? ({ ...u, role } as any) : u)));
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">User Directory</h1>
            <p className="text-sm text-muted font-medium">Search and manage user roles.</p>
          </div>
          <input className="input-field w-72" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/phone/district…" />
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted italic">No users.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Name</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Phone</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">District</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-navy">{u.fullName}</td>
                    <td className="px-6 py-4 text-sm text-muted">{u.phoneNumber}</td>
                    <td className="px-6 py-4 text-sm text-muted">{u.district || '-'}</td>
                    <td className="px-6 py-4">
                      <select className="input-field py-2" value={u.role} onChange={(e) => setRole(u.id, e.target.value as any)}>
                        <option value="candidate">candidate</option>
                        <option value="controller">controller</option>
                        <option value="chairman">chairman</option>
                        <option value="developer">developer</option>
                      </select>
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

