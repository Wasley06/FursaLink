import React, { useEffect, useState } from 'react';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { Bell, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { Notice } from '../../types';
import { logAudit } from '../../lib/audit';

export default function ControllerNoticesPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Notice['type']>('notice');
  const [audience, setAudience] = useState('all');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!profile) return;
    const snap = await getDocs(
      query(collection(db, 'notices'), where('controllerId', '==', profile.id), orderBy('createdAt', 'desc'), limit(50)),
    );
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notice)));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const create = async () => {
    if (!profile || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'notices'), {
        title: title.trim(),
        content: content.trim(),
        type,
        audience,
        controllerId: profile.id,
        createdAt: serverTimestamp(),
      } as Omit<Notice, 'id'>);
      await logAudit('notice:create', { type, audience });
      setTitle('');
      setContent('');
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Post Notice</h1>
            <p className="text-sm text-muted font-medium">Publish updates to candidates and stakeholders.</p>
          </div>
        </div>
      </div>

      <div className="premium-card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Title</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notice title" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Type</label>
            <select className="input-field" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="notice">Notice</option>
              <option value="announcement">Announcement</option>
              <option value="seminar">Seminar</option>
              <option value="workshop">Workshop</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Audience</label>
          <input className="input-field" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g., all / candidates / district:Mjini" />
        </div>

        <div>
          <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest mb-2">Content</label>
          <textarea rows={5} className="input-field py-3" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write notice…" />
        </div>

        <button disabled={saving || !title.trim() || !content.trim()} onClick={create} className="btn-primary w-full py-3">
          <Plus className="w-4 h-4 mr-2" /> {saving ? 'Publishing…' : 'Publish'}
        </button>
      </div>

      <div className="premium-card">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Recent</div>
        {items.length === 0 ? (
          <div className="text-sm text-muted italic">No notices posted yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                <div className="text-sm font-extrabold text-navy">{n.title}</div>
                <div className="text-xs text-muted font-medium whitespace-pre-line mt-1">{n.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
