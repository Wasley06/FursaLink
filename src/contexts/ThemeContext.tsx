import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UserRole } from '../types';
import { useAuth } from './AuthContext';
import { getLiveAppUrl } from '../lib/liveAppUrl';
import { useSystemConfig } from './SystemConfigContext';

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
  administrator: {
    primary: '#D9A441',
    primaryHover: '#C48C26',
    bg1: 'rgba(217, 164, 65, 0.20)',
    bg2: 'rgba(11, 79, 138, 0.10)',
    bg3: 'rgba(31, 138, 77, 0.08)',
  },
  candidate: {
    primary: '#1F8A4D',
    primaryHover: '#22C55E',
    bg1: 'rgba(31, 138, 77, 0.22)',
    bg2: 'rgba(11, 79, 138, 0.12)',
    bg3: 'rgba(217, 164, 65, 0.10)',
  },
  controller: {
    primary: '#F97316',
    primaryHover: '#EA580C',
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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hashString(input: string) {
  // djb2
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(clamp(Math.round(b), 0, 255))}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rr:
        h = ((gg - bb) / delta) % 6;
        break;
      case gg:
        h = (bb - rr) / delta + 2;
        break;
      default:
        h = (rr - gg) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

function shiftHexHue(hex: string, hueDelta: number) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const next = hslToRgb(h + hueDelta, s, l);
  return rgbToHex(next.r, next.g, next.b);
}

function applyTheme(role: ThemeRole, userSeed: string | null | undefined, overrides?: Partial<ThemeVars> | null) {
  const base = THEME_BY_ROLE[role];
  const vars: ThemeVars = {
    primary: overrides?.primary || base.primary,
    primaryHover: overrides?.primaryHover || base.primaryHover,
    bg1: overrides?.bg1 || base.bg1,
    bg2: overrides?.bg2 || base.bg2,
    bg3: overrides?.bg3 || base.bg3,
  };
  const hueDelta = userSeed ? ((hashString(userSeed) % 37) - 18) : 0; // subtle per-account drift
  const primary = hueDelta ? shiftHexHue(vars.primary, hueDelta) : vars.primary;
  const primaryHover = hueDelta ? shiftHexHue(vars.primaryHover, hueDelta) : vars.primaryHover;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-hover', primaryHover);
  root.style.setProperty('--theme-bg-1', vars.bg1);
  root.style.setProperty('--theme-bg-2', vars.bg2);
  root.style.setProperty('--theme-bg-3', vars.bg3);
  root.dataset.roleTheme = role;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { config } = useSystemConfig();
  const [themeRole, setThemeRole] = useState<ThemeRole>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'candidate' || raw === 'controller' || raw === 'chairman' || raw === 'administrator' || raw === 'developer') return raw;
    return 'chairman';
  });

  // Prefer authenticated role when available.
  const roleFromProfile = useMemo(() => {
    const r = profile?.role;
    if (r === 'candidate' || r === 'controller' || r === 'chairman' || r === 'administrator' || r === 'developer') return r;
    return null;
  }, [profile?.role]);

  useEffect(() => {
    const next = roleFromProfile || themeRole;
    // Seed the palette from the signed-in account so different accounts get distinct accents.
    const seed = profile?.id ? `${getLiveAppUrl()}|${profile.id}` : null;
    const roleOverrides = config?.themeOverrides?.[next] || null;
    applyTheme(next, seed, roleOverrides ? ({ primary: roleOverrides.primary || undefined, primaryHover: roleOverrides.primaryHover || undefined } as any) : null);
    localStorage.setItem(STORAGE_KEY, next);
  }, [roleFromProfile, themeRole, profile?.id, config?.themeOverrides]);

  const value = useMemo(() => ({ themeRole, setThemeRole }), [themeRole]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
