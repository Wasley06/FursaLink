import firebaseConfig from '../../firebase-applet-config.json';

export function getFirebaseProjectId() {
  const projectId = (firebaseConfig as any)?.projectId;
  return typeof projectId === 'string' ? projectId : '';
}

export function getAuthProvidersConsoleUrl() {
  const projectId = getFirebaseProjectId();
  if (!projectId) return '';
  return `https://console.firebase.google.com/project/${projectId}/authentication/providers`;
}

