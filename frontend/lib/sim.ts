import { PracticeDriver, type Driver, type Reveal, type RunInit, type StepResult } from "./driver";

/** 64 hex characters from a seeded generator. Real ciphertext handles also change on every step. */
function fakeHandle(seed: number): string {
  let a = seed >>> 0;
  let out = "0x";
  for (let i = 0; i < 8; i++) {
    a = (Math.imul(a ^ (a >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0;
    out += a.toString(16).padStart(8, "0");
  }
  return out;
}

export interface SimOptions {
  /** Milliseconds each step takes, to preview the decrypting state. */
  latency: number;
  /** Every Nth move fails, to preview the error state. 0 means never. */
  failEvery: number;
}

/**
 * Preview driver for the chain screens. It plays locally like practice mode but behaves like the
 * Sepolia driver: delays, opaque handles that change every step, and optional failures.
 * Nothing is sent anywhere and nothing is encrypted. The UI labels it as simulated.
 */
export class SimChainDriver implements Driver {
  readonly mode = "chain" as const;
  readonly label = "Simulated chain, preview only";
  readonly simulated = true;
  private inner = new PracticeDriver();
  private n = 0;
  private seed = Math.floor(Math.random() * 1e9);

  constructor(private opts: SimOptions = { latency: 900, failEvery: 0 }) {}

  private wait(): Promise<void> {
    return new Promise((r) => setTimeout(r, this.opts.latency));
  }

  private withHandles(r: StepResult): StepResult {
    this.n++;
    return {
      ...r,
      handles: {
        pos: fakeHandle(this.seed + this.n * 3),
        alive: fakeHandle(this.seed + this.n * 3 + 1),
        hazards: fakeHandle(this.seed),
      },
      txHash: fakeHandle(this.seed + this.n * 7 + 5),
    };
  }

  async begin(): Promise<RunInit> {
    await this.wait();
    const init = await this.inner.begin();
    return { runId: "7", step0: this.withHandles(init.step0) };
  }

  async move(dir: number): Promise<StepResult> {
    await this.wait();
    if (this.opts.failEvery > 0 && (this.n + 1) % this.opts.failEvery === 0) {
      this.n++;
      throw new Error("The relayer did not answer in time.");
    }
    return this.withHandles(await this.inner.move(dir));
  }

  async finish(onPhase?: (p: "finishing" | "finalizing") => void): Promise<Reveal> {
    onPhase?.("finishing");
    await this.wait();
    onPhase?.("finalizing");
    await this.wait();
    return { ...(await this.inner.finish()), hazardsHandle: fakeHandle(this.seed) };
  }
}
