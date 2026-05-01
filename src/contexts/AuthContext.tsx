import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { clearDemoSession, DemoSession, getDemoSession, setDemoSession } from '../lib/demoSession';
import { normalizeStoredRole } from '../lib/roles';
import { readViteEnvBool } from '../lib/env';

interface AuthContextType {
  user: User | { uid: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInDemo: (session: DemoSession) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const demoEnabled = readViteEnvBool('VITE_ENABLE_DEMO_AUTH', true);
    const existingDemo = demoEnabled ? getDemoSession() : null;
    if (demoEnabled && existingDemo) {
      setIsDemo(true);
      setUser({ uid: existingDemo.uid } as any);
      setProfile({
        id: existingDemo.uid,
        fullName: existingDemo.fullName,
        phoneNumber: existingDemo.phoneNumber,
        role: normalizeStoredRole(existingDemo.role),
        profileProgress: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserProfile);
      setLoading(false);
      return;
    }

    let unsubscribeProfile: null | (() => void) = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (nextUser) {
        setLoading(true);
        const docRef = doc(db, 'users', nextUser.uid);
        unsubscribeProfile = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const raw = { id: docSnap.id, ...docSnap.data() } as UserProfile;
              setProfile({ ...raw, role: normalizeStoredRole((raw as any).role) } as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          () => setLoading(false),
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const signOut = async () => {
    if (isDemo) {
      clearDemoSession();
      setIsDemo(false);
      setUser(null);
      setProfile(null);
      return;
    }
    await auth.signOut();
  };

  const signInDemo = (session: DemoSession) => {
    const demoEnabled = readViteEnvBool('VITE_ENABLE_DEMO_AUTH', true);
    if (!demoEnabled) return;
    setDemoSession(session);
    setIsDemo(true);
    setUser({ uid: session.uid } as any);
    setProfile({
      id: session.uid,
      fullName: session.fullName,
      phoneNumber: session.phoneNumber,
      role: normalizeStoredRole(session.role),
      profileProgress: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserProfile);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, signInDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
