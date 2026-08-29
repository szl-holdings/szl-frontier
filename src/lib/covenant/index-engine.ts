import { fnv1a } from "./sha256";

export const EMBED_DIM = 48;
export const EMBED_REVISION = "szl-lexhash-v1";

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "as",
  "is", "by", "at", "from", "that", "this", "be", "it", "into", "its",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function embed(tokens: string[]): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  if (!tokens.length) return v;
  for (const t of tokens) {
    const h = fnv1a(t);
    const i = h % EMBED_DIM;
    const sign = h & 1 ? 1 : -1;
    v[i] += sign * (1 + ((h >>> 8) % 7) / 10);
  }
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

export function cosine(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function lexicalScore(queryTokens: string[], docTokens: string[]): number {
  if (!queryTokens.length) return 0;
  const set = new Set(docTokens);
  let hit = 0;
  for (const t of queryTokens) if (set.has(t)) hit++;
  return hit / queryTokens.length;
}

export function hybridScore(queryTokens: string[], qVec: number[], docTokens: string[], dVec: number[]): number {
  const v = cosine(qVec, dVec);
  const k = lexicalScore(queryTokens, docTokens);
  return 0.62 * Math.max(0, v) + 0.38 * k;
}
