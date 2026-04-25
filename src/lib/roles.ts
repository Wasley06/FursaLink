import type { StoredUserRole, UserRole } from '../types';

export type LoginRole = UserRole;

export function normalizeLoginRole(role?: string | null): LoginRole {
  if (role === 'controller') return 'controller';
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
    case 'developer':
      return 'Developer';
  }
}

export function normalizeStoredRole(role: StoredUserRole | string | null | undefined): UserRole {
  if (role === 'admin') return 'chairman';
  if (role === 'chairman') return 'chairman';
  if (role === 'controller') return 'controller';
  if (role === 'developer') return 'developer';
  return 'candidate';
}
