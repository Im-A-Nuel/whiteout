import { type EngineState, MAX_MOVES, cellOfBit, randomMap, score, start, step } from "./engine";

/** What the player is allowed to learn after a step. Nothing about the map beyond the two signals. */
export interface StepResult {
  pos: number; // cell index
  alive: boolean;
  collected: number;
  cold: boolean;
  glint: boolean;
  /** Ciphertext handles shown in Chain view (chain mode only). */
  handles?: { pos: string; alive: string; hazards: string };
  txHash?: string;
}

/** Everything revealed once the run is finished and finalized. */
export interface Reveal {
  hazards: bigint;
  prizes: bigint;
  dirs: number[];
  score: number;
  finalizeTx?: string;
  hazardsHandle?: string;
}

export interface RunInit {
  runId: string;
  step0: StepResult;
}

export interface Driver {
  readonly mode: "practice" | "chain";
  readonly label: string;
  /** True for the preview driver: behaves like chain mode but nothing is on Sepolia. */
  readonly simulated?: boolean;
  /** Resolves with the opening signals at the gate. */
  begin(): Promise<RunInit>;
  move(dir: number): Promise<StepResult>;
  /** Ends the run and returns the revealed map. */
  finish(onPhase?: (p: "finishing" | "finalizing") => void): Promise<Reveal>;
}

function toResult(s: EngineState): StepResult {
  return { pos: cellOfBit(s.pos), alive: s.alive, collected: s.collected, cold: s.cold, glint: s.glint };
}

/** Local plaintext run. The map lives only inside this object and is exposed by `finish`. */
export class PracticeDriver implements Driver {
  readonly mode = "practice" as const;
  readonly label = "Practice run, nothing is encrypted";
  private state: EngineState | null = null;

  async begin(): Promise<RunInit> {
    const { hazards, prizes } = randomMap();
    this.state = start(hazards, prizes);
    return { runId: "practice", step0: toResult(this.state) };
  }

  async move(dir: number): Promise<StepResult> {
    if (!this.state) throw new Error("run not started");
    if (this.state.dirs.length >= MAX_MOVES) throw new Error("out of steps");
    this.state = step(this.state, dir);
    return toResult(this.state);
  }

  async finish(): Promise<Reveal> {
    if (!this.state) throw new Error("run not started");
    return {
      hazards: this.state.hazards,
      prizes: this.state.prizesInitial,
      dirs: this.state.dirs,
      score: score(this.state),
    };
  }
}
