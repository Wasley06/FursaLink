import { auth } from './firebase';
import { getLiveAppUrl } from './liveAppUrl';
import { enqueueOfflineAction } from './offlineActions';

export async function ensureCandidateReference(): Promise<{ ok: boolean; candidateIndex?: string; error?: string }> {
  if (!auth.currentUser) return { ok: false, error: 'not_signed_in' };
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${getLiveAppUrl()}/api/candidate/allocate-reference`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: String(body?.error || body?.detail || 'allocate_failed') };
    return { ok: true, candidateIndex: String(body?.candidateIndex || '') };
  } catch (e: any) {
    enqueueOfflineAction({ type: 'candidate_allocate_ref' });
    return { ok: false, error: String(e?.message || 'network_error') };
  }
}
