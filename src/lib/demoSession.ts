export type DemoRole = 'candidate' | 'controller' | 'chairman';

export type DemoSession = {
  uid: string;
  role: DemoRole;
  fullName: string;
  phoneNumber: string;
};

const STORAGE_KEY = 'fursalink:demoSession';

export function getDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    if (!parsed?.uid || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDemoSession(session: DemoSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export const DEMO_USERS: Record<DemoRole, Omit<DemoSession, 'uid'>> = {
  candidate: { role: 'candidate', fullName: 'Demo Candidate', phoneNumber: '0777000001' },
  controller: { role: 'controller', fullName: 'Demo Controller', phoneNumber: '0777000002' },
  chairman: { role: 'chairman', fullName: 'Demo Chairman', phoneNumber: '0777000003' },
};

const rawPin = (import.meta as any).env?.VITE_DEMO_PIN;
export const DEMO_PIN = typeof rawPin === 'string' && rawPin.trim() ? rawPin.trim() : '12345678';
