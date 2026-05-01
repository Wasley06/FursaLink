import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Language } from './I18nContext';

export type SystemConfig = {
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  minDesktopVersion?: string;
  featureFlags?: Record<string, boolean>;
  defaultLanguage?: Language;
  announcementBanner?: {
    enabled?: boolean;
    level?: 'info' | 'warning' | 'critical';
    message?: string;
  };
  themeOverrides?: {
    chairman?: { primary?: string; primaryHover?: string };
    candidate?: { primary?: string; primaryHover?: string };
    controller?: { primary?: string; primaryHover?: string };
    developer?: { primary?: string; primaryHover?: string };
  };
  updatedAt?: any;
};

type Value = {
  config: SystemConfig | null;
  loading: boolean;
};

const Ctx = createContext<Value | undefined>(undefined);

export function SystemConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'systemConfig', 'global');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setConfig(snap.exists() ? (snap.data() as any) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ config, loading }), [config, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSystemConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSystemConfig must be used within SystemConfigProvider');
  return ctx;
}
