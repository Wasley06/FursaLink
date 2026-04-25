import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Shield } from 'lucide-react';
import { db } from '../../lib/firebase';

type AuditLog = {
  id: string;
  actorId: string;
  action: string;
  createdAt?: any;
  meta?: any;
};

export default function SecurityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(100)));
        setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as AuditLog)));
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
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">System Security</h1>
            <p className="text-sm text-muted font-medium">Audit events and access monitoring.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted italic">No audit logs yet.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                <div className="text-xs text-muted font-bold uppercase tracking-widest">{l.action}</div>
                <div className="text-sm text-navy font-medium mt-2">Actor: {l.actorId}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

