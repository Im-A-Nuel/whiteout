import { Dir, MAX_MOVES, type EngineState, cellOfBit, step } from "../../../frontend/lib/engine";

/** What a player can see: only the signals after each step, never the map. */
export interface Obs {
  pos: number;
  cold: boolean;
  glint: boolean;
  stepsLeft: number;
  alive: boolean; // a real player can decrypt this too
}

export interface Agent {
  name: string;
  /** Called once at the start with the opening observation. */
  reset(o: Obs): void;
  /** Returns a direction, or "finish" to end the run now. */
  act(o: Obs): number | "finish";
}

const DELTAS: Record<number, [number, number]> = { 0: [-1, 0], 1: [1, 0], 2: [0, -1], 3: [0, 1] };
const rc = (c: number): [number, number] => [c >> 3, c & 7];
const nbrs = (c: number): { dir: number; cell: number }[] => {
  const [r, k] = rc(c);
  const out: { dir: number; cell: number }[] = [];
  for (const d of [0, 1, 2, 3]) {
    const nr = r + DELTAS[d][0];
    const nk = k + DELTAS[d][1];
    if (nr >= 0 && nr < 8 && nk >= 0 && nk < 8) out.push({ dir: d, cell: nr * 8 + nk });
  }
  return out;
};

export function randomWalker(rand: () => number): Agent {
  return { name: "random", reset() {}, act: () => Math.floor(rand() * 4) };
}

/** Shortest path over known-safe cells from `from` to the gate, as a list of directions, or null. */
function pathHome(from: number, safe: Set<number>): number[] | null {
  const prev = new Map<number, { cell: number; dir: number } | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift()!;
    if (c === 0) {
      const dirs: number[] = [];
      let cur = c;
      while (prev.get(cur)) {
        const p = prev.get(cur)!;
        dirs.unshift(p.dir);
        cur = p.cell;
      }
      return dirs;
    }
    for (const n of nbrs(c)) {
      if (!prev.has(n.cell) && (safe.has(n.cell) || n.cell === 0)) {
        prev.set(n.cell, { cell: c, dir: n.dir });
        queue.push(n.cell);
      }
    }
  }
  return null;
}

/**
 * Deduction agent. Standing on a Quiet cell proves its neighbours are not pits. It explores
 * unvisited proven-safe cells first, then the least suspicious unknown, follows Glint, and heads home
 * along proven-safe cells while it still has the oil to make it.
 */
export function deductionAgent(rand: () => number, opts: { risk: number } = { risk: 0.35 }): Agent {
  const safe = new Set<number>([0]);
  const visited = new Set<number>([0]);
  const suspect = new Map<number, number>(); // cell -> number of cold sightings next to it
  const coldAt = new Map<number, boolean>();
  const glintAt = new Map<number, boolean>();
  let last = 0;

  const observe = (o: Obs) => {
    last = o.pos;
    visited.add(o.pos);
    safe.add(o.pos);
    coldAt.set(o.pos, o.cold);
    glintAt.set(o.pos, o.glint);
    if (!o.cold) for (const n of nbrs(o.pos)) safe.add(n.cell);
    else for (const n of nbrs(o.pos)) if (!safe.has(n.cell)) suspect.set(n.cell, (suspect.get(n.cell) ?? 0) + 1);
    // a cell next to a Quiet visited cell is safe even if it was suspected
    for (const s of [...suspect.keys()]) if (safe.has(s)) suspect.delete(s);
  };

  return {
    name: "deduction",
    reset(o) {
      safe.clear();
      visited.clear();
      suspect.clear();
      safe.add(0);
      observe(o);
    },
    act(o) {
      observe(o);
      const home = pathHome(o.pos, safe);
      const homeLen = home ? home.length : Infinity;
      // head home when the remaining oil is about to run out
      if (o.pos === 0 && o.stepsLeft <= 6) return "finish";
      if (home && o.stepsLeft <= homeLen + 1) return home.length ? home[0] : "finish";
      const options = nbrs(o.pos);
      const score = (n: { dir: number; cell: number }) => {
        let s = rand() * 0.2;
        if (safe.has(n.cell)) s += 1;
        else s -= (suspect.get(n.cell) ?? 0) * 1.5 + 0.4;
        if (!visited.has(n.cell)) s += 1.2;
        if (o.glint && !visited.has(n.cell)) s += 0.5;
        return s;
      };
      const ranked = options.map((n) => ({ n, s: score(n) })).sort((a, b) => b.s - a.s);
      // only gamble on an unproven cell if the oil allows and the dice say so
      const top = ranked[0];
      if (!safe.has(top.n.cell) && rand() > opts.risk && home && o.stepsLeft > homeLen + 2) {
        const bestSafe = ranked.find((r) => safe.has(r.n.cell));
        if (bestSafe) return bestSafe.n.dir;
      }
      return top.n.dir;
    },
  };
}

/** Follows Glint and avoids Cold, without keeping a map of what it learned. */
export function greedyAgent(rand: () => number): Agent {
  let prev = 0;
  return {
    name: "greedy",
    reset() {
      prev = 0;
    },
    act(o) {
      if (o.stepsLeft <= (o.pos >> 3) + (o.pos & 7) + 1) {
        // walk back toward the gate along rows then columns
        const [r, k] = rc(o.pos);
        if (o.pos === 0) return "finish";
        return r > 0 ? Dir.North : k > 0 ? Dir.West : "finish";
      }
      const options = nbrs(o.pos).filter((n) => n.cell !== prev);
      const pick = options[Math.floor(rand() * options.length)] ?? nbrs(o.pos)[0];
      prev = o.pos;
      return o.cold && rand() < 0.6 ? Dir.North : pick.dir;
    },
  };
}

export interface RunResult {
  score: number;
  alive: boolean;
  atGate: boolean;
  steps: number;
  collected: number;
  treasureOnMap: number;
}

export function playRun(agent: Agent, state: EngineState, treasureOnMap: number): RunResult {
  let s = state;
  const obs = (): Obs => ({ pos: cellOfBit(s.pos), cold: s.cold, glint: s.glint, stepsLeft: MAX_MOVES - s.dirs.length, alive: s.alive });
  agent.reset(obs());
  while (s.dirs.length < MAX_MOVES) {
    const a = agent.act(obs());
    if (a === "finish") break;
    s = step(s, a);
  }
  const atGate = s.pos === 1n;
  return {
    score: s.alive && atGate ? s.collected : 0,
    alive: s.alive,
    atGate,
    steps: s.dirs.length,
    collected: s.collected,
    treasureOnMap,
  };
