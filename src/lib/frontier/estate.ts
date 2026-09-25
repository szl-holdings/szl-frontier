/** Presentation helpers for public estate observations. Not a collector. */

export function displayCount(n: number | null | undefined): string {
  return n === null || n === undefined ? "UNKNOWN" : String(n);
}

export function filterNamedItems<T extends { id: string }>(items: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => item.id.toLowerCase().includes(needle));
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { slice: T[]; page: number; pages: number; total: number } {
  const size = pageSize > 0 ? pageSize : 1;
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.min(Math.max(0, page), pages - 1);
  return {
    slice: items.slice(safe * size, safe * size + size),
    page: safe,
    pages,
    total: items.length,
  };
}

export function isHttpsUrl(value: string): boolean {
  return /^https:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$/.test(value);
}

export function observationAgeSeconds(finishedAt: string, now = new Date()): number | null {
  const t = Date.parse(finishedAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (now.getTime() - t) / 1000);
}

export function freshnessLabel(finishedAt: string, now = new Date()): string {
  const age = observationAgeSeconds(finishedAt, now);
  if (age === null) return "UNKNOWN";
  if (age > 86400) return "HISTORICAL_REQUIRES_REOBSERVATION";
  return "RECORDED_NOT_LIVE";
}
