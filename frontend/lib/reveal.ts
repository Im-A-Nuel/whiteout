import type { Reveal } from "./driver";
import { cellOfBit, cellsOf, replay, type EngineState } from "./engine";
import { cellLabel, col, row } from "./zones";

export type Ending = "home" | "oil" | "lost";

export interface Analysis {
  states: EngineState[];
  /** cell index of the pilgrim after each step, index 0 is the gate */
  cells: number[];
  pits: number[];
  prizes: number[];
  /** cells where a relic was picked up, with the step index that took it */
  takenAt: { cell: number; step: number }[];
  ending: Ending;
  deathStep: number | null;
  finalCell: number;
  relics: number;
  oilLeft: number;
  closeCall: string | null;
}

export function analyze(reveal: Reveal): Analysis {
  const states = replay(reveal.hazards, reveal.prizes, reveal.dirs);
  const cells = states.map((s) => cellOfBit(s.pos));
  const takenAt: Analysis["takenAt"] = [];
  let deathStep: number | null = null;
  for (let i = 1; i < states.length; i++) {
    if (states[i].collected > states[i - 1].collected) takenAt.push({ cell: cells[i], step: i });
    if (deathStep === null && !states[i].alive) deathStep = i;
  }
  const last = states[states.length - 1];
  const ending: Ending = !last.alive ? "lost" : last.pos === 1n ? "home" : "oil";
  const pits = cellsOf(reveal.hazards);

  let closeCall: string | null = null;
  const stop = deathStep ?? states.length;
  for (let i = 0; i < stop; i++) {
    const c = cells[i];
    const adj = [c - 8, c + 8, c - 1, c + 1].filter((n) => n >= 0 && n < 64 && Math.abs(col(n) - col(c)) + Math.abs(row(n) - row(c)) === 1);
    const pit = adj.find((n) => pits.includes(n));
    if (pit !== undefined) {
      closeCall = `${cellLabel(c)}, pit at ${cellLabel(pit)}`;
      break;
    }
  }

  return {
    states,
    cells,
    pits,
    prizes: cellsOf(reveal.prizes),
    takenAt,
    ending,
    deathStep,
    finalCell: cells[cells.length - 1],
    relics: last.collected,
    oilLeft: 24 - reveal.dirs.length,
    closeCall,
  };
}

export const ENDING_LABEL: Record<Ending, string> = {
  home: "Home alive",
  oil: "Out of oil",
  lost: "Lost in the storm",
};
