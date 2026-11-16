export interface BoardRow {
  runId: string;
  player: string;
  score: number;
  steps: number;
}

export interface MarkedRow extends BoardRow {
  mine: boolean;
}

/** Flags the rows that belong to the connected wallet. Addresses compare case-insensitively. */
export function markMine<T extends BoardRow>(rows: T[], address: string | null): (T & { mine: boolean })[] {
  const me = address?.toLowerCase() ?? null;
  return rows.map((r) => ({ ...r, mine: me !== null && r.player.toLowerCase() === me }));
}

/** Best result of the connected wallet, using the same order as the board (score, then fewer steps). */
export function bestOf<T extends BoardRow>(rows: T[], address: string | null): T | null {
  if (!address) return null;
  const me = address.toLowerCase();
  const mine = rows.filter((r) => r.player.toLowerCase() === me);
  if (!mine.length) return null;
  return mine.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.steps < a.steps) ? b : a));
}
