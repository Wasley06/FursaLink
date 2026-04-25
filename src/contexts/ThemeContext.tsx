import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UserRole } from '../types';
import { useAuth } from './AuthContext';

type ThemeRole = UserRole;

type ThemeVars = {
  primary: string;
  primaryHover: string;
  bg1: string;
  bg2: string;
  bg3: string;
};

const THEME_BY_ROLE: Record<ThemeRole, ThemeVars> = {
  chairman: {
    primary: '#0B4F8A',
    primaryHover: '#1565C0',
    bg1: 'rgba(11, 79, 138, 0.18)',
    bg2: 'rgba(217, 164, 65, 0.18)',
    bg3: 'rgba(31, 138, 77, 0.12)',
  },
  candidate: {
    primary: '#1F8A4D',
    primaryHover: '#22C55E',
    bg1: 'rgba(31, 138, 77, 0.22)',
    bg2: 'rgba(11, 79, 138, 0.12)',
    bg3: 'rgba(217, 164, 65, 0.10)',
  },
  controller: {
    primary: '#D9A441',
    primaryHover: '#C8921E',
    bg1: 'rgba(217, 164, 65, 0.22)',
    bg2: 'rgba(11, 79, 138, 0.12)',
    bg3: 'rgba(31, 138, 77, 0.10)',
  },
  developer: {
    primary: '#B11226',
    primaryHover: '#8A0D1D',
    bg1: 'rgba(177, 18, 38, 0.22)',
    bg2: 'rgba(11, 79, 138, 0.10)',
    bg3: 'rgba(217, 164, 65, 0.08)',
  },
};

const STORAGE_KEY = 'fursalink:themeRole';

type ThemeContextValue = {
  themeRole: ThemeRole;
  setThemeRole: (role: ThemeRole) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(role: ThemeRole) {
  const vars = THEME_BY_ROLE[role];
  const root = document.documentElement;
  root.style.setProperty('--color-primary', vars.primary);
  root.style.setProperty('--color-primary-hover', vars.primaryHover);
  root.style.setProperty('--theme-bg-1', vars.bg1);
  root.style.setProperty('--theme-bg-2', vars.bg2);
  root.style.setProperty('--theme-bg-3', vars.bg3);
  root.dataset.roleTheme = role;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [themeRole, setThemeRole] = useState<ThemeRole>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'candidate' || raw === 'controller' || raw === 'chairman' || raw === 'developer') return raw;
    return 'chairman';
  });

  // Prefer authenticated role when available.
  const roleFromProfile = useMemo(() => {
    const r = profile?.role;
    if (r === 'candidate' || r === 'controller' || r === 'chairman' || r === 'developer') return r;
    return null;
  }, [profile?.role]);

  useEffect(() => {
    const next = roleFromProfile || themeRole;
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, [roleFromProfile, themeRole]);

  const value = useMemo(() => ({ themeRole, setThemeRole }), [themeRole]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

