import { type Cell, col, row, zoneName, type Zone } from "./zones";

/**
 * Geometry of the 3D view. Height and decoration are functions of the cell index only, exactly like the 2D
 * terrain rules: they must never depend on pits, treasure or any encrypted value, or the picture would leak
 * the map.
 */

/** Height of the top face of the block, in tile units, per region. */
const BASE_HEIGHT: Record<Zone, number> = {
  courtyard: 0.5,
  garden: 0.72,
  ice: 0.3,
  plank: 0.58,
  sanct: 1.0,
};

export function heightOf(cell: Cell): number {
  const wobble = ((col(cell) * 7 + row(cell) * 13) % 3) * 0.05;
  return Math.round((BASE_HEIGHT[zoneName(cell)] + wobble) * 100) / 100;
}

/** World position of the centre of a cell. Row 0 is the far edge (north), column 0 the west edge. */
export const worldX = (cell: Cell): number => col(cell) - 3.5;
export const worldZ = (cell: Cell): number => row(cell) - 3.5;

/** How far a pit block sinks when the map is revealed. */
export const PIT_DEPTH = 0.34;

/** Brightness multiplier per fog state, matching the 2D board (UI_SPEC 6.2) but a little lifted for the lights. */
export type TileState = "reveal" | "gate" | "current" | "visited" | "neighbor" | "unknown";
export const TILE_BRIGHTNESS: Record<TileState, number> = {
  reveal: 1,
  gate: 1,
  current: 1,
  visited: 0.72,
  neighbor: 0.78,
  unknown: 0.46,
};

/** Fog puff opacity over a tile per state. */
export const FOG_OPACITY: Record<TileState, number> = {
  reveal: 0,
  gate: 0.12,
  current: 0,
  visited: 0.34,
  neighbor: 0.42,
  unknown: 0.82,
};

export function tileState(cell: Cell, pos: Cell, visited: ReadonlySet<Cell>, revealed: boolean): TileState {
  if (revealed) return "reveal";
  if (cell === pos) return "current";
  if (cell === 0) return "gate";
  if (visited.has(cell)) return "visited";
  const dr = Math.abs(row(cell) - row(pos));
  const dc = Math.abs(col(cell) - col(pos));
  if (dr + dc === 1) return "neighbor";
  return "unknown";
}

/** Camera defaults: south of the board looking north, so north is up and east is right like in 2D. */
export const CAMERA = {
  fov: 44,
  distance: 17,
  polar: 1.1, // radians from straight up, high enough that no tile hides another
  overviewPolar: 0.55, // the Tilt button flips between this and the default
  horizonPolar: 1.32, // and this low cinematic angle that shows the mountains
  minDistance: 9,
  maxDistance: 27,
  minPolar: 0.28,
  maxPolar: 1.4,
} as const;

/** Pixel scale of the render: how many screen pixels one rendered pixel covers, from the container width. */
export function pixelScale(widthPx: number): number {
  return Math.min(4, Math.max(2, Math.round(widthPx / 230)));
}

/** Path dots between visited cells, spaced half a tile apart, in world units. */
export function trailDots(trail: readonly Cell[]): { x: number; z: number; y: number }[] {
  const out: { x: number; z: number; y: number }[] = [];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    if (a === b) continue;
    const ha = heightOf(a);
    const hb = heightOf(b);
    for (const t of [0, 0.5]) {
      out.push({
        x: worldX(a) + (worldX(b) - worldX(a)) * t,
        z: worldZ(a) + (worldZ(b) - worldZ(a)) * t,
        y: ha + (hb - ha) * t,
      });
    }
  }
  return out;
}
