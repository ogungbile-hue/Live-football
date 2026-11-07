import logger from '../logger';

export async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<any> {
  const effectiveTimeout = Math.max(timeoutMs, 8000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    const res = await fetch(url, { 
      signal: controller.signal, 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    } as any);
    if (res.status === 429) {
      logger.warn(`Rate limited by external provider API`, { url: url.split('/')[2] });
      return [];
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 60)}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
