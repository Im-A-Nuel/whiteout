import { cellsOf, randomMap, start } from "../../../frontend/lib/engine";
import { deductionAgent, greedyAgent, playRun, randomWalker, type Agent, type RunResult } from "./agents";

/** Small seeded PRNG so a simulation is reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function word(rand: () => number): bigint {
  const hi = BigInt(Math.floor(rand() * 4294967296));
  const lo = BigInt(Math.floor(rand() * 4294967296));
  return (hi << 32n) | lo;
}

export interface Summary {
  agent: string;
  runs: number;
  meanScore: number;
  zeroRate: number;
  deathRate: number;
  meanTreasureOnMap: number;
  meanPits: number;
  histogram: Record<number, number>;
}

export function simulate(make: (rand: () => number) => Agent, runs: number, seed: number): Summary {
  const rand = mulberry32(seed);
  const mapRand = () => word(rand);
  let total = 0;
  let zero = 0;
  let dead = 0;
  let treasure = 0;
  let pits = 0;
  const histogram: Record<number, number> = {};
  const agent = make(rand);
  for (let i = 0; i < runs; i++) {
    const { hazards, prizes } = randomMap(mapRand);
    const res: RunResult = playRun(agent, start(hazards, prizes), cellsOf(prizes).length);
    total += res.score;
    if (res.score === 0) zero++;
    if (!res.alive) dead++;
    treasure += res.treasureOnMap;
    pits += cellsOf(hazards).length;
    histogram[res.score] = (histogram[res.score] ?? 0) + 1;
  }
  return {
    agent: agent.name,
    runs,
    meanScore: total / runs,
    zeroRate: zero / runs,
    deathRate: dead / runs,
    meanTreasureOnMap: treasure / runs,
    meanPits: pits / runs,
    histogram,
  };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function report(s: Summary): string {
  const hist = Object.keys(s.histogram)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => `${k}:${pct(s.histogram[k] / s.runs)}`)
    .join("  ");
  return [
    `${s.agent.padEnd(10)} runs ${s.runs}  mean score ${s.meanScore.toFixed(2)}  zero ${pct(s.zeroRate)}  died ${pct(s.deathRate)}`,
    `${"".padEnd(10)} pits/map ${s.meanPits.toFixed(2)}  treasure/map ${s.meanTreasureOnMap.toFixed(2)}`,
    `${"".padEnd(10)} score distribution  ${hist}`,
  ].join("\n");
}

// run from the CLI: npm run sim -- 5000 42
if (process.argv[1] && /run\.(ts|js)$/.test(process.argv[1])) {
  const runs = Number(process.argv[2] ?? 3000);
  const seed = Number(process.argv[3] ?? 1);
  console.log(`Whiteout balance simulation (seed ${seed})\n`);
  for (const make of [randomWalker, greedyAgent, (r: () => number) => deductionAgent(r)]) {
    console.log(report(simulate(make, runs, seed)) + "\n");
  }
  console.log("Targets (hypotheses, not requirements): deduction agent mean score 2 to 4, zero-score rate 40 to 60 percent.");
}
