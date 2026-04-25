import React, { useEffect, useState } from 'react';
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';
import { CalendarDays, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { listPublishedEvents } from '../../services/dataService';
import type { Booking, Event } from '../../types';

export default function EventsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      try {
        const [evs, bSnap] = await Promise.all([
          listPublishedEvents(50),
          getDocs(query(collection(db, 'bookings'), where('userId', '==', profile.id), limit(200))),
        ]);
        setEvents(evs);
        const bMap: Record<string, boolean> = {};
        bSnap.docs.forEach((d) => (bMap[(d.data() as any).eventId] = true));
        setBookings(bMap);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profile]);

  const book = async (eventId: string) => {
    if (!profile) return;
    await addDoc(collection(db, 'bookings'), {
      userId: profile.id,
      eventId,
      status: 'booked',
      createdAt: serverTimestamp(),
    } as Omit<Booking, 'id'>);
    setBookings((p) => ({ ...p, [eventId]: true }));
  };

  return (
    <div className="space-y-6">
      <div className="premium-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky border border-white/50">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Events</h1>
            <p className="text-sm text-muted font-medium">Seminars, workshops, and campaigns.</p>
          </div>
        </div>
      </div>

      <div className="premium-card">
        {loading ? (
          <div className="text-sm text-muted font-medium">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted italic">No published events yet.</div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-navy truncate">{ev.title}</div>
                  <div className="text-xs text-muted font-medium truncate">
                    {ev.type.toUpperCase()} • {ev.location || 'Zanzibar'}
                  </div>
                </div>
                {bookings[ev.id] ? (
                  <span className="inline-flex items-center gap-1 text-emerald text-xs font-black uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Booked
                  </span>
                ) : (
                  <button
                    onClick={() => book(ev.id)}
                    className="btn-outline bg-white/40 border-white/50 py-2 px-4 text-xs font-black uppercase tracking-widest"
                  >
                    Book
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

