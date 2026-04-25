import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { MailPlus, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { Message, UserProfile } from '../../types';
import { logAudit } from '../../lib/audit';

type Tab = 'inbox' | 'sent';

export default function MessagesPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipients, setRecipients] = useState<UserProfile[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const title = useMemo(() => (tab === 'inbox' ? 'Inbox' : 'Sent'), [tab]);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      const field = tab === 'inbox' ? 'receiverId' : 'senderId';
      const snap = await getDocs(
        query(collection(db, 'messages'), where(field, '==', profile.id), orderBy('createdAt', 'desc'), limit(50)),
      );
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    };
    run();
  }, [profile, tab]);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      // Candidate can message controllers within the same district and the chairman.
      const parts: UserProfile[] = [];
      const [controllers, chairmen] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'controller'), where('district', '==', profile.district), limit(50))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'chairman'), limit(10))),
      ]);
      controllers.docs.forEach((d) => parts.push({ id: d.id, ...(d.data() as any) } as UserProfile));
      chairmen.docs.forEach((d) => parts.push({ id: d.id, ...(d.data() as any) } as UserProfile));
      setRecipients(parts);
      if (!receiverId && parts[0]?.id) setReceiverId(parts[0].id);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const send = async () => {
    if (!profile || !receiverId || !content.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: profile.id,
        receiverId,
        subject: subject.trim() || undefined,
        content: content.trim(),
        read: false,
        createdAt: serverTimestamp(),
      } as Omit<Message, 'id'>);
      await logAudit('message:send', { receiverId });
      setSubject('');
      setContent('');
      setTab('sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-navy">Messages</h1>
            <p className="text-sm text-muted font-medium">Secure internal communication.</p>
          </div>
          <div className="flex gap-2 rounded-2xl bg-white/30 border border-white/50 backdrop-blur-md p-1">
            {(['inbox', 'sent'] as const).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    'px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                    active ? 'bg-white text-navy shadow-sm' : 'text-navy/60 hover:text-navy hover:bg-white/40',
                  ].join(' ')}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 premium-card">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">{title}</div>
          {messages.length === 0 ? (
            <div className="text-sm text-muted italic">No messages.</div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                  <div className="text-xs text-muted font-bold uppercase tracking-widest">
                    {m.subject ? m.subject : 'Message'}
                  </div>
                  <div className="text-sm text-navy font-medium mt-2 whitespace-pre-line">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="premium-card">
          <div className="flex items-center gap-2 text-navy font-extrabold">
            <MailPlus className="w-5 h-5 text-primary" /> New Message
          </div>
          <div className="mt-4 space-y-3">
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest">To</label>
            <select className="input-field" value={receiverId} onChange={(e) => setReceiverId(e.target.value)}>
              {recipients.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>

            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest">Subject</label>
            <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Optional" />

            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest">Message</label>
            <textarea
              rows={5}
              className="input-field py-3"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message…"
            />

            <button disabled={sending || !content.trim()} onClick={send} className="btn-primary w-full py-3">
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
