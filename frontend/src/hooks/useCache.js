const CACHE = new Map();
const TTL   = 3 * 60 * 1000; // 3 хвилини

export function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { CACHE.delete(key); return null; }
  return entry.data;
}

export function cacheSet(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
}

export function cacheInvalidate(prefix) {
  for (const k of CACHE.keys()) {
    if (k.startsWith(prefix)) CACHE.delete(k);
  }
}

/**
 * useCache — хук що повертає кешовані дані одразу (без спінера)
 * і тихо оновлює їх у фоні.
 *
 * @param {string} key       унікальний ключ кешу
 * @param {Function} fetcher async-функція що повертає дані
 * @param {any[]} deps       залежності (як у useEffect)
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useCache(key, fetcher, deps = []) {
  const [data, setData]       = useState(() => cacheGet(key));
  const [loading, setLoading] = useState(!cacheGet(key));
  const [error,  setError]    = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      cacheSet(key, result);
      setData(result);
      setError(null);
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = cacheGet(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      // тихо оновлюємо у фоні
      load(true);
    } else {
      load(false);
    }
    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  const refresh = useCallback(() => {
    cacheInvalidate(key);
    load(false);
  }, [key, load]);

  return { data, loading, error, refresh };
}