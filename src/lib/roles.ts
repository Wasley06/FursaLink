export type LoginRole = 'candidate' | 'controller' | 'chairman';

export function normalizeLoginRole(role?: string | null): LoginRole {
  if (role === 'controller') return 'controller';
  if (role === 'chairman' || role === 'admin') return 'chairman';
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
  }
}

