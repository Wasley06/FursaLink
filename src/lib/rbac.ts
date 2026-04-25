import type { UserRole } from '../types';

export type Permission =
  | 'jobs:read'
  | 'jobs:write'
  | 'applications:read'
  | 'applications:write'
  | 'approvals:read'
  | 'approvals:write'
  | 'approvals:decide'
  | 'users:read'
  | 'users:write'
  | 'messages:read'
  | 'messages:write'
  | 'notices:read'
  | 'notices:write'
  | 'security:read'
  | 'config:write';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  candidate: ['jobs:read', 'applications:read', 'applications:write', 'messages:read', 'messages:write', 'notices:read'],
  controller: [
    'jobs:read',
    'jobs:write',
    'applications:read',
    'applications:write',
    'approvals:read',
    'approvals:write',
    'users:read',
    'messages:read',
    'messages:write',
    'notices:read',
    'notices:write',
  ],
  chairman: [
    'jobs:read',
    'applications:read',
    'approvals:read',
    'approvals:decide',
    'users:read',
    'users:write',
    'messages:read',
    'messages:write',
    'notices:read',
    'notices:write',
    'security:read',
    'config:write',
  ],
  developer: ['jobs:read', 'users:read', 'messages:read', 'security:read'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
