/** Share concurrent dashboard reads; cache only explicitly opted-in reference data. */
export function createAdminReadClient(fetcher: typeof fetch = (input, init) => fetch(input, init), now = Date.now) {
  const pending = new Map<string, Promise<unknown>>();
  const cache = new Map<string, { value: unknown; at: number }>();
  let generation = 0;
  const invalidate = () => { generation++; cache.clear(); pending.clear(); };
  async function read<T>(url: string, maxAgeMs = 0): Promise<T> {
    const saved = cache.get(url);
    if (maxAgeMs > 0 && saved && now() - saved.at < maxAgeMs) return saved.value as T;
    const existing = pending.get(url);
    if (existing) return existing as Promise<T>;
    const startedGeneration = generation;
    const request = (async () => {
      const response = await fetcher(url, {
        credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) {
        invalidate();
        if (typeof window !== 'undefined') window.location.href = '/admin/login';
        throw new Error('Sessão expirada. A redirecionar...');
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || `Erro HTTP ${response.status}`);
      }
      const value = await response.json();
      if (maxAgeMs > 0 && generation === startedGeneration) {
        cache.delete(url);
        cache.set(url, { value, at: now() });
        if (cache.size > 64) cache.delete(cache.keys().next().value!);
      }
      return value;
    })();
    pending.set(url, request);
    try { return await request as T; }
    finally { if (pending.get(url) === request) pending.delete(url); }
  }
  return { read, invalidate };
}

const client = createAdminReadClient();
export const readAdminJson = client.read;
export const invalidateAdminReads = client.invalidate;
if (typeof window !== 'undefined') {
  // Registered before component effects, so every subscriber sees fresh data.
  window.addEventListener('ryma_schedule_changed', invalidateAdminReads);
  window.addEventListener('ryma_authenticated', invalidateAdminReads);
}
