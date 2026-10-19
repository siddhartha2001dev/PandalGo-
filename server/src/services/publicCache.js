const entries = new Map();

export function getPublicCache(key) {
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }
  return entry.value;
}

export function setPublicCache(key, value, ttlMs = 30_000) {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function clearPublicCache(prefix = '') {
  for (const key of entries.keys()) {
    if (!prefix || key.startsWith(prefix)) entries.delete(key);
  }
}
