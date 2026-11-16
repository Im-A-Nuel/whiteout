import { type Cell, zoneName, type Zone } from "./zones";

export const CHAPTERS: { name: string; zone: Zone; tile: string }[] = [
  { name: "The Courtyard", zone: "courtyard", tile: "courtyard1" },
  { name: "Frozen Garden", zone: "garden", tile: "garden1" },
  { name: "Mirror Lake", zone: "ice", tile: "ice1" },
  { name: "Bell Bridge", zone: "plank", tile: "plank1" },
  { name: "The Sanctum", zone: "sanct", tile: "sanct1" },
];

/** Chapter index 0..4 of a cell. The gate belongs to chapter 1. */
export function chapterOf(cell: Cell): number {
  const z = zoneName(cell);
  return CHAPTERS.findIndex((c) => c.zone === z);
}

export function chaptersReached(cells: Cell[]): Set<number> {
  return new Set(cells.map(chapterOf));
}

export const DIR_NAMES = ["North", "South", "West", "East"] as const;

export interface LogEntry {
  step: number;
  title: string;
  flavor: string;
  /** Set when this step entered a chapter for the first time. */
  chapter?: number;
}

export function logEntry(args: {
  step: number;
  dir: number;
  cold: boolean;
  glint: boolean;
  tookRelic: boolean;
  chapter?: number;
  pushedBack?: boolean;
}): LogEntry {
  const { step, dir, cold, glint, tookRelic, chapter, pushedBack } = args;
  const signals = cold && glint ? "Cold and Glint" : cold ? "Cold" : glint ? "Glint" : "Quiet";
  const title = `${DIR_NAMES[dir & 3]}. ${tookRelic ? "Relic taken. " : ""}${signals}.`;
  let flavor: string;
  if (pushedBack) flavor = "The wind pushes you back.";
  else if (tookRelic) flavor = cold ? "You pocket it. The slabs feel thin here." : "Heavier. The lantern sways.";
  else if (cold && glint) flavor = "Frost on your sleeve, and gold close by.";
  else if (cold) flavor = "Your breath fogs. Something is below the stone.";
  else if (glint) flavor = "A faint shine ahead.";
  else flavor = "Only the wind.";
  return { step, title, flavor, chapter };
}
