import { createClient } from 'redis';
import { env } from '../config/env.js';

const entries = new Map();
let redisClient = null;
let redisConnectPromise = null;
let redisWarningShown = false;

function redisKey(key) {
  return `${env.REDIS_CACHE_PREFIX}${key}`;
}

function warnRedisOnce(message) {
  if (!redisWarningShown) {
    redisWarningShown = true;
    console.warn(`[Cache] Redis unavailable; using in-process cache fallback. ${message}`);
  }
}

async function getRedisClient() {
  if (!env.REDIS_URL) return null;
  if (redisClient?.isReady) return redisClient;
  if (!redisConnectPromise) {
    redisClient = createClient({ url: env.REDIS_URL, socket: { connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS } });
    redisClient.on('error', (err) => warnRedisOnce(err.message));
    redisConnectPromise = redisClient.connect()
      .then(() => redisClient)
      .catch((err) => {
        warnRedisOnce(err.message);
        redisConnectPromise = null;
        return null;
      });
  }
  return redisConnectPromise;
}

export function getPublicCache(key) {
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }
  return entry.value;
}

export async function getPublicCacheAsync(key) {
  const local = getPublicCache(key);
  if (local) return local;

  try {
    const client = await getRedisClient();
    if (!client) return null;
    const raw = await client.get(redisKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ttl = await client.ttl(redisKey(key));
    setPublicCache(key, parsed, ttl > 0 ? ttl * 1000 : 30_000, { persist: false });
    return parsed;
  } catch (err) {
    warnRedisOnce(err.message);
    return null;
  }
}

export function setPublicCache(key, value, ttlMs = 30_000, { persist = true } = {}) {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (persist && env.REDIS_URL) {
    getRedisClient().then((client) => {
      if (!client) return;
      return client.set(redisKey(key), JSON.stringify(value), { PX: ttlMs });
    }).catch((err) => warnRedisOnce(err.message));
  }
  return value;
}

export function clearPublicCache(prefix = '') {
  for (const key of entries.keys()) {
    if (!prefix || key.startsWith(prefix)) entries.delete(key);
  }
  if (env.REDIS_URL) {
    getRedisClient().then(async (client) => {
      if (!client) return;
      const keys = [];
      for await (const key of client.scanIterator({ MATCH: `${redisKey(prefix)}*`, COUNT: 100 })) keys.push(key);
      if (keys.length) await client.del(keys);
    }).catch((err) => warnRedisOnce(err.message));
  }
}

export async function closePublicCache() {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  redisClient = null;
  redisConnectPromise = null;
}
