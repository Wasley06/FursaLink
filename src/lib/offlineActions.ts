import { auth } from './firebase';
import { getLiveAppUrl } from './liveAppUrl';

type OfflineAction =
  | { id: string; type: 'admin_push_one'; candidateId: string; chairmanRemarks: string; createdAt: number }
  | { id: string; type: 'admin_push_many'; candidateIds: string[]; chairmanRemarks: string; createdAt: number }
  | { id: string; type: 'candidate_allocate_ref'; createdAt: number };

const KEY = 'fursalink:offlineActions:v1';

function readAll(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(KEY) || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as OfflineAction[]) : [];
  } catch {
    return [];
  }
}

function writeAll(actions: OfflineAction[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(actions.slice(-200)));
  } catch {
    // ignore
  }
}

function uid() {
  return `oa_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function enqueueOfflineAction(
  action:
    | Omit<Extract<OfflineAction, { type: 'admin_push_one' }>, 'id' | 'createdAt'>
    | Omit<Extract<OfflineAction, { type: 'admin_push_many' }>, 'id' | 'createdAt'>
    | Omit<Extract<OfflineAction, { type: 'candidate_allocate_ref' }>, 'id' | 'createdAt'>,
) {
  const list = readAll();
  list.push({ ...(action as any), id: uid(), createdAt: Date.now() } as OfflineAction);
  writeAll(list);
}

export async function processOfflineActionsOnce(): Promise<{ processed: number; remaining: number }> {
  if (!navigator.onLine) return { processed: 0, remaining: readAll().length };
  if (!auth.currentUser) return { processed: 0, remaining: readAll().length };

  const token = await auth.currentUser.getIdToken().catch(() => '');
  if (!token) return { processed: 0, remaining: readAll().length };

  const list = readAll();
  if (list.length === 0) return { processed: 0, remaining: 0 };

  let processed = 0;
  const keep: OfflineAction[] = [];
  for (const a of list) {
    try {
      if (a.type === 'admin_push_one') {
        const res = await fetch(`${getLiveAppUrl()}/api/administrator/push`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ candidateId: a.candidateId, chairmanRemarks: a.chairmanRemarks }),
        });
        if (!res.ok) throw new Error(`push_failed:${res.status}`);
      } else if (a.type === 'admin_push_many') {
        const res = await fetch(`${getLiveAppUrl()}/api/administrator/push`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ candidateIds: a.candidateIds, chairmanRemarks: a.chairmanRemarks }),
        });
        if (!res.ok) throw new Error(`push_many_failed:${res.status}`);
      } else if (a.type === 'candidate_allocate_ref') {
        const res = await fetch(`${getLiveAppUrl()}/api/candidate/allocate-reference`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`allocate_failed:${res.status}`);
      }
      processed += 1;
    } catch {
      keep.push(a);
    }
  }

  writeAll(keep);
  return { processed, remaining: keep.length };
}

export function setupOfflineActionSync() {
  const run = () => processOfflineActionsOnce().catch(() => {});
  window.addEventListener('online', run);
  // Kick once on startup
  setTimeout(run, 1500);
  return () => window.removeEventListener('online', run);
}
