import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Megaphone } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { Notice } from '../../types';

export default function NoticesPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(50)));
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notice)));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Notices</h1>
            <p className="text-sm text-muted font-medium">Official announcements and updates.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading notices…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted italic">No notices yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-navy truncate">{n.title}</div>
                    <div className="text-xs text-muted font-medium mt-1 whitespace-pre-line">{n.content}</div>
                  </div>
                  <span className="status-pill status-pending">{n.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

