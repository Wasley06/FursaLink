import type { StoredUserRole, UserRole } from '../types';

export type LoginRole = UserRole;

export function normalizeLoginRole(role?: string | null): LoginRole {
  if (role === 'controller') return 'controller';
  if (role === 'administrator') return 'administrator';
  if (role === 'chairman' || role === 'admin') return 'chairman';
  if (role === 'developer' || role === 'dev') return 'developer';
  return 'candidate';
}

export function labelForRole(role: LoginRole) {
  switch (role) {
    case 'candidate':
      return 'Candidate';
    case 'controller':
      return 'Controller';
    case 'chairman':
      return 'Chairman';
    case 'administrator':
      return 'Administrator';
    case 'developer':
      return 'Developer';
  }
}

export function normalizeStoredRole(role: StoredUserRole | string | null | undefined): UserRole {
  const raw = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (raw === 'admin') return 'chairman';
  if (raw === 'chairman') return 'chairman';
  if (raw === 'administrator') return 'administrator';
  if (raw === 'controller') return 'controller';
  if (raw === 'developer' || raw === 'dev') return 'developer';
  return 'candidate';
}
