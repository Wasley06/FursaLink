import React, { useEffect, useState } from 'react';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { Message, UserProfile } from '../../types';
import { logAudit } from '../../lib/audit';

export default function ControllerMessagesPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipients, setRecipients] = useState<UserProfile[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      const [inbox, sent, candidates, chairmen] = await Promise.all([
        getDocs(query(collection(db, 'messages'), where('receiverId', '==', profile.id), orderBy('createdAt', 'desc'), limit(50))),
        getDocs(query(collection(db, 'messages'), where('senderId', '==', profile.id), orderBy('createdAt', 'desc'), limit(50))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'candidate'), where('district', '==', profile.district), limit(100))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'chairman'), limit(10))),
      ]);
      setMessages([
        ...inbox.docs.map((d) => ({ id: d.id, ...d.data() } as Message)),
        ...sent.docs.map((d) => ({ id: d.id, ...d.data() } as Message)),
      ]);
      const people: UserProfile[] = [];
      candidates.docs.forEach((d) => people.push({ id: d.id, ...(d.data() as any) } as UserProfile));
      chairmen.docs.forEach((d) => people.push({ id: d.id, ...(d.data() as any) } as UserProfile));
      setRecipients(people);
      if (!receiverId && people[0]?.id) setReceiverId(people[0].id);
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
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Communication Central</h1>
            <p className="text-sm text-muted font-medium">Message candidates and executives securely.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 premium-card">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Recent</div>
          {messages.length === 0 ? (
            <div className="text-sm text-muted italic">No messages yet.</div>
          ) : (
            <div className="space-y-3">
              {messages.slice(0, 50).map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-5 py-4">
                  <div className="text-xs text-muted font-bold uppercase tracking-widest">{m.subject || 'Message'}</div>
                  <div className="text-sm text-navy font-medium mt-2 whitespace-pre-line">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="premium-card">
          <div className="text-sm font-extrabold text-navy">New Message</div>
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
            <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <label className="block text-[10px] font-black text-navy/40 uppercase tracking-widest">Message</label>
            <textarea rows={5} className="input-field py-3" value={content} onChange={(e) => setContent(e.target.value)} />
            <button disabled={sending || !content.trim()} onClick={send} className="btn-primary w-full py-3">
              <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
