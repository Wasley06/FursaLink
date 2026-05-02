import type { StoredUserRole, UserRole } from '../types';

export type LoginRole = UserRole;

export function normalizeLoginRole(role?: string | null): LoginRole {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'controller') return 'controller';
  if (raw === 'administrator') return 'administrator';
  if (['chairman', 'chairperson', 'chair', 'admin'].includes(raw)) return 'chairman';
  if (['developer', 'dev', 'superadmin', 'super_admin'].includes(raw)) return 'developer';
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
  if (['admin', 'chairman', 'chairperson', 'chair', 'chairman_demo', 'chairman-demo'].includes(raw)) return 'chairman';
  if (['administrator', 'admin_user', 'administrator_demo', 'administrator-demo'].includes(raw)) return 'administrator';
  if (raw === 'controller') return 'controller';
  if (['developer', 'dev', 'superadmin', 'super_admin'].includes(raw)) return 'developer';
  return 'candidate';
}
