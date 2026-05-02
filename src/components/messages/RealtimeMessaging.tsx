import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { MessageSquare, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import type { Message, UserProfile } from '../../types';
import { fetchMessagingRecipients } from '../../lib/messagingPolicy';
import { logAudit } from '../../lib/audit';
import { sendNotification } from '../../lib/notify';
import { cn } from '../../lib/utils';

type Thread = {
  otherId: string;
  otherName: string;
  otherRole: string;
  unread: number;
  lastAt: number;
  lastPreview: string;
};

function toMillis(v: any) {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  const n = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isFinite(n) ? n : 0;
}

function conversationId(a: string, b: string) {
  return [a, b].sort().join('__');
}

export function RealtimeMessaging({
  title = 'Messages',
  subtitle = 'Real-time internal messaging.',
}: {
  title?: string;
  subtitle?: string;
}) {
  const { profile } = useAuth();
  const [recipients, setRecipients] = useState<UserProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const [typingOther, setTypingOther] = useState(false);
  const typingTimer = useRef<any>(null);
  const typingSentAt = useRef<number>(0);

  const allMessages = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of inbox) map.set(m.id, m);
    for (const m of sent) map.set(m.id, m);
    return Array.from(map.values()).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }, [inbox, sent]);

  const recipientsById = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    for (const r of recipients) map[r.id] = r;
    return map;
  }, [recipients]);

  useEffect(() => {
    const run = async () => {
      if (!profile?.id) return;
      const people = await fetchMessagingRecipients(profile);
      setRecipients(people);
      if (!selectedId && people[0]?.id) setSelectedId(people[0].id);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role, profile?.district]);

  useEffect(() => {
    if (!profile?.id) return;
    const base = collection(db, 'messages');
    const qInbox = query(base, where('receiverId', '==', profile.id), orderBy('createdAt', 'desc'), limit(200));
    const qSent = query(base, where('senderId', '==', profile.id), orderBy('createdAt', 'desc'), limit(200));
    const unsub1 = onSnapshot(qInbox, (snap) => setInbox(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))));
    const unsub2 = onSnapshot(qSent, (snap) => setSent(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any))));
    return () => {
      unsub1();
      unsub2();
    };
  }, [profile?.id]);

  const threads = useMemo<Thread[]>(() => {
    if (!profile?.id) return [];
    const byOther = new Map<string, Thread>();
    for (const m of allMessages) {
      const otherId = m.senderId === profile.id ? m.receiverId : m.senderId;
      if (!otherId) continue;
      const other = recipientsById[otherId];
      const name = other?.fullName || otherId;
      const role = (other as any)?.role || 'user';
      const at = toMillis(m.createdAt);
      const prev = byOther.get(otherId);
      const unread = m.receiverId === profile.id && m.read !== true ? 1 : 0;
      if (!prev) {
        byOther.set(otherId, {
          otherId,
          otherName: name,
          otherRole: role,
          unread,
          lastAt: at,
          lastPreview: (m.content || '').slice(0, 120),
        });
      } else {
        prev.unread += unread;
        if (at > prev.lastAt) {
          prev.lastAt = at;
          prev.lastPreview = (m.content || '').slice(0, 120);
          prev.otherName = name;
          prev.otherRole = role;
        }
      }
    }
    const out = Array.from(byOther.values());
    out.sort((a, b) => b.lastAt - a.lastAt);
    return out;
  }, [allMessages, profile?.id, recipientsById]);

  useEffect(() => {
    if (!profile?.id || !selectedId) return;
    const otherTypingDoc = doc(db, 'typing', `${conversationId(profile.id, selectedId)}__${selectedId}`);
    const unsub = onSnapshot(otherTypingDoc, (snap) => {
      const data = snap.data() as any;
      const isTyping = data?.isTyping === true;
      const updatedAt = toMillis(data?.updatedAt);
      const fresh = updatedAt && Date.now() - updatedAt < 9000;
      setTypingOther(isTyping && fresh);
    });
    return () => unsub();
  }, [profile?.id, selectedId]);

  const threadMessages = useMemo(() => {
    if (!profile?.id || !selectedId) return [];
    const msgs = allMessages
      .filter((m) => (m.senderId === profile.id && m.receiverId === selectedId) || (m.senderId === selectedId && m.receiverId === profile.id))
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
    return msgs;
  }, [allMessages, profile?.id, selectedId]);

  const markThreadRead = async () => {
    if (!profile?.id || !selectedId) return;
    const unread = threadMessages.filter((m) => m.receiverId === profile.id && m.senderId === selectedId && m.read !== true);
    if (unread.length === 0) return;
    for (const m of unread.slice(0, 50)) {
      try {
        await updateDoc(doc(db, 'messages', m.id), { read: true, updatedAt: serverTimestamp() } as any);
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    markThreadRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, selectedId, threadMessages.length]);

  const setTyping = async (isTyping: boolean) => {
    if (!profile?.id || !selectedId) return;
    const now = Date.now();
    if (isTyping && now - typingSentAt.current < 1200) return;
    typingSentAt.current = now;
    try {
      await setDoc(
        doc(db, 'typing', `${conversationId(profile.id, selectedId)}__${profile.id}`),
        {
          conversationId: conversationId(profile.id, selectedId),
          userId: profile.id,
          isTyping,
          updatedAt: serverTimestamp(),
        } as any,
        { merge: true },
      );
    } catch {
      // best-effort typing indicator
    }
  };

  const onChangeContent = (v: string) => {
    setContent(v);
    if (!profile?.id || !selectedId) return;
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 2500);
  };

  const send = async () => {
    if (!profile?.id || !selectedId || !content.trim()) return;
    setSending(true);
    try {
      const cid = conversationId(profile.id, selectedId);
      await addDoc(collection(db, 'messages'), {
        senderId: profile.id,
        receiverId: selectedId,
        conversationId: cid,
        content: content.trim(),
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any);

      await sendNotification({
        recipientId: selectedId,
        title: 'New message',
        message: `${profile.fullName}: ${content.trim().slice(0, 120)}`,
        targetPath: '/dashboard',
      });
      await logAudit('message:send', { receiverId: selectedId });
      setContent('');
      setTyping(false);
    } finally {
      setSending(false);
    }
  };

  const selected = selectedId ? recipientsById[selectedId] : null;

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
            <p className="text-sm text-muted font-medium">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="premium-card p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-sky">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-navy">Threads</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted">{threads.length}</div>
            </div>
            <div className="mt-3">
              <select
                className="input-field py-2 w-full"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={recipients.length === 0}
              >
                {recipients.length === 0 ? <option value="">No recipients</option> : null}
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.fullName || r.phoneNumber || r.id).toString()} • {(r.role || 'user').toString()}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[11px] text-muted font-medium">Pick a recipient to start a new thread.</div>
            </div>
          </div>
          <div className="divide-y divide-sky">
            {threads.length === 0 ? (
              <div className="px-6 py-6 text-sm text-muted italic">No messages yet. Select a recipient and send a message.</div>
            ) : (
              threads.map((t) => {
                const active = t.otherId === selectedId;
                return (
                  <button
                    key={t.otherId}
                    type="button"
                    onClick={() => setSelectedId(t.otherId)}
                    className={cn('w-full text-left px-6 py-4 transition-colors hover:bg-sky/20', active && 'bg-sky/30')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-navy truncate">{t.otherName}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary">{t.otherRole}</div>
                      </div>
                      {t.unread > 0 ? (
                        <div className="px-2 py-1 rounded-full bg-primary text-white text-[10px] font-black">
                          {t.unread}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs text-muted font-medium line-clamp-2">{t.lastPreview || '—'}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 premium-card p-0 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-sky flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-navy truncate">{selected?.fullName || (selectedId ? selectedId : 'Select a thread')}</div>
              <div className="text-[11px] text-muted font-medium">
                {typingOther ? <span className="text-primary font-bold">Typing…</span> : selected ? (selected as any).role : ''}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-5 space-y-3 bg-sky/10">
            {threadMessages.length === 0 ? (
              <div className="text-sm text-muted italic">Start the conversation.</div>
            ) : (
              threadMessages.map((m) => {
                const mine = m.senderId === profile?.id;
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl border border-white/50 backdrop-blur-md px-4 py-3',
                        mine ? 'bg-primary text-white' : 'bg-white/40 text-navy',
                      )}
                    >
                      <div className={cn('text-sm font-medium whitespace-pre-line', mine ? 'text-white' : 'text-navy')}>
                        {m.content}
                      </div>
                      <div className={cn('mt-2 text-[10px] font-black uppercase tracking-widest', mine ? 'text-white/70' : 'text-muted')}>
                        {toMillis(m.createdAt) ? new Date(toMillis(m.createdAt)).toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-5 border-t border-sky bg-white/30">
            <div className="flex items-end gap-3">
              <textarea
                rows={2}
                value={content}
                onChange={(e) => onChangeContent(e.target.value)}
                className="input-field py-3 flex-1"
                placeholder="Write a message…"
                disabled={!selectedId}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={sending || !content.trim() || !selectedId}
                onClick={send}
                className="btn-primary px-5 py-3 whitespace-nowrap"
              >
                <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending…' : 'Send'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
