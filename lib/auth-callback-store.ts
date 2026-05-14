type StoredAuthPayload = {
  payload: unknown;
  createdAt: number;
};

const STORE_TTL_MS = 10 * 60 * 1000;

const globalForStore = globalThis as typeof globalThis & {
  __authCallbackStore?: Map<string, StoredAuthPayload>;
};

const store = globalForStore.__authCallbackStore ?? new Map<string, StoredAuthPayload>();
globalForStore.__authCallbackStore = store;

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now - value.createdAt > STORE_TTL_MS) {
      store.delete(key);
    }
  }
}

export function saveAuthCallbackPayload(id: string, payload: unknown) {
  cleanupExpiredEntries();
  store.set(id, { payload, createdAt: Date.now() });
}

export function consumeAuthCallbackPayload(id: string) {
  cleanupExpiredEntries();
  const found = store.get(id);
  if (!found) {
    return null;
  }
  store.delete(id);
  return found.payload;
}

/** Read the payload without removing it (used by submit route so debug page can still access it). */
export function peekAuthCallbackPayload(id: string) {
  cleanupExpiredEntries();
  return store.get(id)?.payload ?? null;
}
