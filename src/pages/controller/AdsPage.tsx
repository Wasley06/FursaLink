import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { ImagePlus, Megaphone, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { uploadUserFile } from '../../lib/uploads';

type AdRow = {
  id: string;
  title: string;
  imageUrl?: string;
  imageRef?: any;
  linkUrl?: string;
  enabled?: boolean;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function ControllerAdsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    const qy = query(collection(db, 'ads'), where('createdBy', '==', profile.id), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as AdRow)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [profile?.id]);

  const create = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setError('');
    try {
      if (!title.trim()) throw new Error('Title is required.');
      if (!file) throw new Error('Select an image to upload.');

      const up = await uploadUserFile({
        uid: profile.id,
        file,
        kind: 'ad_image',
        nameHint: `${title}-ad`,
        onProgress: setPct,
      });

      await addDoc(collection(db, 'ads'), {
        title: title.trim(),
        linkUrl: linkUrl.trim(),
        enabled: true,
        imageUrl: up.url || '',
        imageRef: up.ref as any,
        createdBy: profile.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any);

      setTitle('');
      setLinkUrl('');
      setFile(null);
      setPct(0);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload ad.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (ad: AdRow) => {
    if (!ad?.id) return;
    await updateDoc(doc(db, 'ads', ad.id), { enabled: !(ad.enabled === true), updatedAt: serverTimestamp() } as any);
  };

  const remove = async (ad: AdRow) => {
    if (!ad?.id) return;
    if (!confirm(`Delete ad "${ad.title}"?`)) return;
    await deleteDoc(doc(db, 'ads', ad.id));
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Ads</h1>
            <p className="text-sm text-muted font-medium">Upload announcement banner images for the landing page.</p>
          </div>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      <div className="premium-card">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Ad title</div>
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Public Announcement" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Link (optional)</div>
              <input className="input-field" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Image</div>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file ? <div className="mt-2 text-xs text-muted font-medium">Uploading: {pct}%</div> : null}
            </div>
            <button type="button" className="btn-primary py-2.5 px-4 text-xs" onClick={create} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" /> {saving ? 'Uploading…' : 'Upload ad'}
            </button>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted italic">No ads uploaded yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((ad) => (
              <div key={ad.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-12 rounded-2xl bg-sky border border-white/50 overflow-hidden flex items-center justify-center">
                    {ad.imageUrl ? <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-muted" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-navy truncate">{ad.title}</div>
                    <div className="text-xs text-muted font-medium truncate">{ad.linkUrl || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={ad.enabled ? 'btn-primary py-2 px-3 text-xs' : 'btn-outline py-2 px-3 text-xs'} onClick={() => toggle(ad)}>
                    {ad.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button type="button" className="btn-outline p-2 rounded-xl border-danger/20 bg-danger/10 text-danger hover:bg-danger/15" onClick={() => remove(ad)} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

