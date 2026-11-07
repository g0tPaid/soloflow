import { getOfflineStore } from '@/lib/offline/store';
import type { StoredFormDraft } from '@/lib/offline/types';
import {
  FORM_DRAFT_LOCAL_MIRROR_MAX_CHARS,
  formDraftKey,
  packFormDraft,
  sameFormDraftScope,
  type FormDraftScope,
  type FormDraftSnapshot,
} from '@/lib/form-draft/model';

const LOCAL_PREFIX = 'soloflow:form-draft:';

export interface FormDraftDurable {
  get(key: string): Promise<StoredFormDraft | null>;
  put(record: StoredFormDraft): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface FormDraftWriteResult {
  imagesOmitted: boolean;
}

export interface FormDraftRepository {
  read(scope: FormDraftScope): Promise<FormDraftSnapshot | null>;
  write(snapshot: FormDraftSnapshot): Promise<FormDraftWriteResult>;
  remove(scope: FormDraftScope): Promise<void>;
}

interface RepositoryOptions {
  durable: FormDraftDurable;
  localStorage?: Storage | null;
}

function localKey(key: string) {
  return `${LOCAL_PREFIX}${key}`;
}

function parseSnapshot(json: string | null | undefined): FormDraftSnapshot | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as FormDraftSnapshot;
    if (!parsed || parsed.version !== 1 || !parsed.scope || !parsed.content) return null;
    return parsed;
  } catch {
    return null;
  }
}

function pickSnapshot(candidates: Array<FormDraftSnapshot | null>) {
  let best: FormDraftSnapshot | null = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!best || candidate.savedAt > best.savedAt) {
      best = candidate;
      continue;
    }
    if (candidate.savedAt === best.savedAt && best.imagesOmitted && !candidate.imagesOmitted) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Device draft store. IndexedDB or SQLite is the primary copy.
 * A localStorage mirror is written in the same turn so navigation and a
 * killed WebView can still recover text without a network request.
 */
export function createFormDraftRepository(options: RepositoryOptions): FormDraftRepository {
  const memory = new Map<string, FormDraftSnapshot>();
  const local = options.localStorage === undefined ? browserLocalStorage() : options.localStorage;
  let clearGeneration = 0;

  return {
    async read(scope) {
      const key = formDraftKey(scope);
      let durable: FormDraftSnapshot | null = null;
      let durableFailed = false;
      try {
        durable = parseSnapshot((await options.durable.get(key))?.json);
      } catch {
        durableFailed = true;
      }
      const mirrored = parseSnapshot(readLocal(local, key));
      const best = pickSnapshot([memory.get(key) ?? null, durable, mirrored]);
      if (!best && durableFailed && !mirrored && !memory.has(key)) {
        throw new Error('Could not read the saved draft on this device');
      }
      if (best && !sameFormDraftScope(best.scope, scope)) return null;
      return best;
    },

    async write(snapshot) {
      const packed = packFormDraft(snapshot);
      const key = formDraftKey(packed.scope);
      const generation = clearGeneration;
      memory.set(key, packed);
      const record: StoredFormDraft = {
        key,
        organizationId: packed.scope.organizationId,
        savedAt: packed.savedAt,
        json: JSON.stringify(packed),
      };
      let durableFailed = false;
      try {
        await options.durable.put(record);
      } catch {
        durableFailed = true;
      }
      const mirrored = writeLocal(local, key, packed);
      if (clearGeneration !== generation) {
        if (memory.get(key)?.savedAt === packed.savedAt) memory.delete(key);
        removeLocal(local, key);
        await options.durable.delete(key).catch(() => undefined);
        return { imagesOmitted: packed.imagesOmitted };
      }
      if (durableFailed && mirrored === 'failed') {
        throw new Error('Could not save the draft on this device');
      }
      const imagesOmitted = packed.imagesOmitted || (durableFailed && mirrored === 'stripped');
      return { imagesOmitted };
    },

    async remove(scope) {
      const key = formDraftKey(scope);
      clearGeneration += 1;
      memory.delete(key);
      removeLocal(local, key);
      try {
        await options.durable.delete(key);
      } catch (error) {
        throw error instanceof Error ? error : new Error('Could not clear the saved draft');
      }
    },
  };
}

function browserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readLocal(local: Storage | null, key: string) {
  if (!local) return null;
  try {
    return local.getItem(localKey(key));
  } catch {
    return null;
  }
}

function writeLocal(
  local: Storage | null,
  key: string,
  snapshot: FormDraftSnapshot,
): 'full' | 'stripped' | 'failed' {
  if (!local) return 'failed';
  const name = localKey(key);
  try {
    const json = JSON.stringify(snapshot);
    if (json.length <= FORM_DRAFT_LOCAL_MIRROR_MAX_CHARS) {
      local.setItem(name, json);
      return 'full';
    }
    const stripped = packFormDraft({
      ...snapshot,
      content: {
        ...snapshot.content,
        items: snapshot.content.items.map((item) =>
          item.imageUrl?.startsWith('data:') ? { ...item, imageUrl: null } : item,
        ),
      },
      imagesOmitted: true,
    });
    const smaller = JSON.stringify(stripped);
    if (smaller.length > FORM_DRAFT_LOCAL_MIRROR_MAX_CHARS) return 'failed';
    local.setItem(name, smaller);
    return 'stripped';
  } catch {
    return 'failed';
  }
}

function removeLocal(local: Storage | null, key: string) {
  if (!local) return;
  try {
    local.removeItem(localKey(key));
  } catch {
    // The primary store is still cleared. A leftover mirror is ignored once
    // its savedAt is older than the clear timestamp on the next read.
  }
}

let defaultRepository: FormDraftRepository | null = null;

export function getFormDraftRepository(): FormDraftRepository {
  defaultRepository ??= createFormDraftRepository({
    durable: {
      get: (key) => getOfflineStore().getFormDraft(key),
      put: (record) => getOfflineStore().putFormDraft(record),
      delete: (key) => getOfflineStore().deleteFormDraft(key),
    },
  });
  return defaultRepository;
}

export function resetFormDraftRepositoryForTests() {
  defaultRepository = null;
}
