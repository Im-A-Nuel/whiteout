/**
 * Terrain is decoration, never game state. Everything here is a function of the cell index only,
 * so the art cannot leak hazards or treasure (UI_SPEC 5.1).
 */
export type Cell = number; // row * 8 + col, row 0 is the top

export type Zone = "courtyard" | "garden" | "ice" | "plank" | "sanct";

/** Row strings, columns A to H. G gate, C courtyard, T garden, I mirror lake, B bell bridge, S sanctum. */
const GRID = ["GCCCTTTT", "CCCCTTTT", "CCTTTIII", "CTTTIIII", "TTIIIIBB", "TIIIBBBS", "IIIBBSSS", "IIBBSSSS"];

export const row = (cell: Cell): number => cell >> 3;
export const col = (cell: Cell): number => cell & 7;
export const cellAt = (r: number, c: number): Cell => r * 8 + c;
export const cellLabel = (cell: Cell): string => `${String.fromCharCode(65 + col(cell))}${row(cell) + 1}`;

export function zoneName(cell: Cell): Zone {
  switch (GRID[row(cell)][col(cell)]) {
    case "G":
    case "C":
      return "courtyard";
    case "T":
      return "garden";
    case "I":
      return "ice";
    case "B":
      return "plank";
    default:
      return "sanct";
  }
}

const VARIANTS = { garden: 3, ice: 3, plank: 2, sanct: 2 } as const;

/** Base tile sprite key, for example `garden2`. Deterministic, same for every run and player. */
export function tileKey(cell: Cell): string {
  const z = zoneName(cell);
  const c = col(cell);
  const r = row(cell);
  if (z === "courtyard") return `courtyard${(c + r * 5) % 7 === 0 ? 3 : (c * 3 + r) % 2 === 0 ? 1 : 2}`;
  return `${z}${((c * 3 + r * 5) % VARIANTS[z]) + 1}`;
}

/** Corner decoration overlay sprite key, or null. Never on the gate. */
export function decor(cell: Cell): string | null {
  const c = col(cell);
  const r = row(cell);
  if (cell === 0 || (c * 5 + r * 3) % 4 !== 0) return null;
  switch (zoneName(cell)) {
    case "courtyard":
      return (c + r) % 2 === 0 ? "decCourtyard" : "decCourtyard2";
    case "garden":
      return "decGarden";
    case "ice":
      return "decIce";
    case "plank":
      return "decPlank";
    default:
      return "decSanct";
  }
}

/** Pit sprite is chosen by the zone of the pit cell. */
export const pitKey = (cell: Cell): string => `pit${zoneName(cell)}`;
