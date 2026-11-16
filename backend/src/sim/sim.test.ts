import { describe, expect, it } from "vitest";
import { deductionAgent, greedyAgent, randomWalker } from "./agents";
import { simulate } from "./run";

describe("balance simulator", () => {
  it("is reproducible for a given seed", () => {
    const a = simulate(randomWalker, 200, 7);
    const b = simulate(randomWalker, 200, 7);
    expect(a.meanScore).toBe(b.meanScore);
    expect(a.deathRate).toBe(b.deathRate);
  });

  it("maps match the design: about 8 pits and 8 treasure on average", () => {
    const s = simulate(randomWalker, 600, 3);
    expect(s.meanPits).toBeGreaterThan(6);
    expect(s.meanPits).toBeLessThan(9);
    expect(s.meanTreasureOnMap).toBeGreaterThan(5.5);
    expect(s.meanTreasureOnMap).toBeLessThan(9);
  });

  it("a deduction agent beats a random walker", () => {
    const rand = simulate(randomWalker, 600, 5);
    const ded = simulate((r) => deductionAgent(r), 600, 5);
    expect(ded.meanScore).toBeGreaterThan(rand.meanScore);
  });

  it("agents always return valid summaries", () => {
    const g = simulate(greedyAgent, 100, 9);
    expect(g.runs).toBe(100);
    expect(g.zeroRate).toBeGreaterThanOrEqual(0);
  });
});
