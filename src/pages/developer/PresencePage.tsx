import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Activity } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types';

type Presence = {
  uid: string;
  role?: string;
  lastSeen?: any;
  userAgent?: string;
  appVersion?: string;
};

export default function PresencePage() {
  const [presence, setPresence] = useState<Presence[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const [pSnap, uSnap] = await Promise.all([
          getDocs(query(collection(db, 'presence'), orderBy('lastSeen', 'desc'), limit(200))),
          getDocs(query(collection(db, 'users'), limit(400))),
        ]);
        setPresence(pSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
        const map: Record<string, UserProfile> = {};
        uSnap.docs.forEach((d) => (map[d.id] = { id: d.id, ...(d.data() as any) } as UserProfile));
        setUsers(map);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const now = Date.now();
  const rows = useMemo(() => {
    return presence.map((p) => {
      const u = users[p.uid];
      const lastSeenMs = p.lastSeen?.toDate ? p.lastSeen.toDate().getTime() : 0;
      const online = lastSeenMs && now - lastSeenMs < 2 * 60 * 1000;
      return { p, u, online, lastSeenMs };
    });
  }, [now, presence, users]);

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Live Presence</h1>
            <p className="text-sm text-muted font-medium">Who is online (last seen within ~2 minutes).</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted italic">No presence data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-sky/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">User</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Role</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">App</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest">Last Seen</th>
                  <th className="px-6 py-3 text-[10px] font-black text-primary uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky">
                {rows.map(({ p, u, online, lastSeenMs }) => (
                  <tr key={p.uid} className="hover:bg-sky/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-navy">{u?.fullName || p.uid}</td>
                    <td className="px-6 py-4 text-sm text-muted">{u?.role || p.role || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted">{p.appVersion || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted">{lastSeenMs ? new Date(lastSeenMs).toLocaleString() : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={online ? 'status-pill status-approved' : 'status-pill status-pending'}>{online ? 'online' : 'offline'}</span>
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

