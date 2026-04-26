import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type { AppNotification } from '../types/notifications';

type Value = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const Ctx = createContext<Value | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const qy = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30),
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [user?.uid]);

  const unreadCount = useMemo(() => items.filter((n) => n.read !== true).length, [items]);

  const markRead = async (id: string) => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'notifications', id), { read: true, updatedAt: serverTimestamp() } as any);
  };

  const markAllRead = async () => {
    if (!user?.uid) return;
    const unread = items.filter((n) => n.read !== true);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    for (const n of unread) {
      batch.update(doc(db, 'notifications', n.id), { read: true, updatedAt: serverTimestamp() } as any);
    }
    await batch.commit();
  };

  const value = useMemo<Value>(() => ({ items, unreadCount, loading, markRead, markAllRead }), [items, unreadCount, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

