export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let last = i - 1;
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1]
        ? last
        : 1 + Math.min(last, prev[j], prev[j - 1]);
      last = tmp;
    }
  }
  return prev[n];
}

export function normalizePlate(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function similarity(a: string, b: string): number {
  const na = normalizePlate(a), nb = normalizePlate(b);
  const d = levenshtein(na, nb);
  const max = Math.max(na.length, nb.length) || 1;
  return Math.round((1 - d / max) * 100);
}

export function isFuzzyMatchCandidate(plateA: string, plateB: string): boolean {
  const parsePlate = (p: string) => {
    const cleaned = p.replace(/[^A-Z0-9]/g, "").toUpperCase();
    return cleaned.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/);
  };
  
  const mA = parsePlate(plateA);
  const mB = parsePlate(plateB);
  
  if (mA && mB) {
    if (mA[1] !== mB[1]) return false;
    if (mA[2] !== mB[2]) return false;
    if (mA[3] !== mB[3]) return false;
  }
  return true;
}
