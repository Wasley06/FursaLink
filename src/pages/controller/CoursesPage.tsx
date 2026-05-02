import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';
import { BookOpen, ImagePlus, Plus, Save } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Course } from '../../types';
import { uploadUserFile } from '../../lib/uploads';

export default function ControllerCoursesPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePct, setImagePct] = useState(0);
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    status: 'published' as 'draft' | 'published' | 'archived',
  });

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    const qy = query(collection(db, 'courses'), where('createdBy', '==', profile.id), orderBy('createdAt', 'desc'), limit(300));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Course)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [profile?.id]);

  const reset = () => {
    setForm({ title: '', category: '', description: '', status: 'published' });
    setImageFile(null);
    setImagePct(0);
    setError('');
  };

  const create = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setError('');
    try {
      let imageUrl = '';
      let imageRef: any = null;
      if (imageFile) {
        const up = await uploadUserFile({
          uid: profile.id,
          file: imageFile,
          kind: 'course_image',
          nameHint: `${form.title || 'course'}-image`,
          onProgress: setImagePct,
        });
        imageRef = up.ref as any;
        imageUrl = up.url || '';
      }

      await addDoc(collection(db, 'courses'), {
        title: form.title.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        status: form.status,
        imageUrl: imageUrl || '',
        imageRef: imageRef || null,
        createdBy: profile.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any);

      setOpen(false);
      reset();
    } catch (e: any) {
      setError(e?.message || 'Failed to create course.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c: Course) => {
    if (!c?.id) return;
    const next = c.status === 'published' ? 'draft' : 'published';
    await updateDoc(doc(db, 'courses', c.id), { status: next, updatedAt: serverTimestamp() } as any);
  };

  const publishedCount = useMemo(() => items.filter((i) => i.status === 'published').length, [items]);

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky border border-white/50">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy">Courses</h1>
              <p className="text-sm text-muted font-medium">Create training courses and attach cover images.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-muted font-bold uppercase tracking-widest">{publishedCount} published</div>
            <button
              type="button"
              className="btn-primary py-2 px-3 text-xs"
              onClick={() => {
                reset();
                setOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> New course
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading courses…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted italic">No courses created yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-sky border border-white/50 overflow-hidden flex items-center justify-center">
                    {c.imageUrl ? <img src={c.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-muted" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-navy truncate">{c.title}</div>
                    <div className="text-xs text-muted font-medium truncate">{c.category || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={c.status === 'published' ? 'status-pill status-approved' : 'status-pill status-pending'}>{c.status}</span>
                  <button type="button" className="btn-outline py-2 px-3 text-xs" onClick={() => toggleStatus(c)}>
                    {c.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open ? (
        <div className="premium-card">
          <div className="text-sm font-extrabold text-navy mb-4">New course</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Title</div>
                <input className="input-field" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Category</div>
                  <input className="input-field" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Status</div>
                  <select className="input-field py-2" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Description</div>
                <textarea className="input-field py-3 min-h-[120px]" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Cover image</div>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                {imageFile ? <div className="mt-2 text-xs text-muted font-medium">Uploading: {imagePct}%</div> : null}
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-outline flex-1" onClick={() => { setOpen(false); reset(); }}>
                  Cancel
                </button>
                <button type="button" className="btn-primary flex-[2]" disabled={saving || !form.title.trim() || !form.description.trim()} onClick={create}>
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
