export interface Revision {
  inquiryId: string;
  editor: string;
  editedAt: string;
  originalDraft: string;
  finalDraft: string;
  diffPercent: number;
  summary: string;
}

export function diffPercent(a: string, b: string): number {
  if (!a && !b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.max(la, lb) === 0) return 0;
  const lev = levenshtein(a, b);
  return Math.round((lev / Math.max(la, lb)) * 100) / 100;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1).fill(0).map((_, i) => i);
  const curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j += 1) prev[j] = curr[j];
  }
  return prev[n];
}

export function aggregateRevisionPatterns(revisions: Revision[]): {
  pattern: string;
  count: number;
}[] {
  const buckets = new Map<string, number>();
  for (const r of revisions) {
    const key = r.summary;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);
}
