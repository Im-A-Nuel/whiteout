import { describe, expect, it } from "vitest";
import { CHAPTERS, chapterOf, logEntry } from "./journey";
import { bitOf, cellsOf, decodePath, Dir, randomMap, replay, score, start, step } from "./engine";
import { cellLabel, decor, tileKey, zoneName } from "./zones";

describe("zones", () => {
  it("tileKey and decor take only a cell", () => {
    expect(tileKey.length).toBe(1);
    expect(decor.length).toBe(1);
  });

  it("every cell has a valid sprite key and the gate has no decoration", () => {
    const valid = /^(courtyard[1-3]|garden[1-3]|ice[1-3]|plank[1-2]|sanct[1-2])$/;
    for (let c = 0; c < 64; c++) expect(tileKey(c)).toMatch(valid);
    expect(decor(0)).toBeNull();
    expect(zoneName(0)).toBe("courtyard");
    expect(chapterOf(0)).toBe(0);
  });

  it("labels cells like A1 to H8", () => {
    expect(cellLabel(0)).toBe("A1");
    expect(cellLabel(63)).toBe("H8");
    expect(cellLabel(9)).toBe("B2");
  });

  it("has five chapters, each reachable", () => {
    const seen = new Set<number>();
    for (let c = 0; c < 64; c++) seen.add(chapterOf(c));
    expect(seen.size).toBe(CHAPTERS.length);
  });
});

describe("engine", () => {
  it("bumps at walls without wrapping", () => {
    let s = start(0n, 0n);
    s = step(s, Dir.North);
    s = step(s, Dir.West);
    expect(s.pos).toBe(1n);
    for (let i = 0; i < 7; i++) s = step(s, Dir.South);
    s = step(s, Dir.West);
    expect(s.pos).toBe(bitOf(56));
  });

  it("pit kills silently and the dead stay put", () => {
    let s = start(bitOf(2), bitOf(3));
    s = step(step(s, Dir.East), Dir.East);
    expect(s.alive).toBe(false);
    const at = s.pos;
    s = step(step(s, Dir.East), Dir.East);
    expect(s.pos).toBe(at);
    expect(s.collected).toBe(0);
  });

  it("collects treasure once and scores only at the gate", () => {
    let s = start(0n, bitOf(1));
    s = step(s, Dir.East);
    expect(s.collected).toBe(1);
    expect(score(s)).toBe(0);
    s = step(s, Dir.West);
    s = step(step(s, Dir.East), Dir.West);
    expect(s.collected).toBe(1);
    expect(score(s)).toBe(1);
  });

  it("signals are orthogonal only", () => {
    let s = start(bitOf(9), 0n);
    expect(s.cold).toBe(false);
    s = step(s, Dir.East);
    expect(s.cold).toBe(true);
    s = step(s, Dir.East);
    expect(s.cold).toBe(false);
  });

  it("decodes the packed path", () => {
    const dirs = [Dir.East, Dir.South, Dir.South, Dir.West];
    let path = 0n;
    for (const d of dirs) path = (path << 2n) | BigInt(d);
    expect(decodePath(path, dirs.length)).toEqual(dirs);
  });

  it("random maps keep the safe zone and never overlap", () => {
    for (let i = 0; i < 200; i++) {
      const { hazards, prizes } = randomMap();
      expect(hazards & 0x103n).toBe(0n);
      expect(prizes & hazards).toBe(0n);
      expect(prizes & 1n).toBe(0n);
    }
  });

  it("replay yields one state per step", () => {
    const states = replay(bitOf(20), bitOf(5), [Dir.East, Dir.East, Dir.South]);
    expect(states).toHaveLength(4);
    expect(cellsOf(states[3].pos)).toHaveLength(1);
  });
});

describe("journey log", () => {
  it("builds titles and flavor from the spec", () => {
    const a = logEntry({ step: 9, dir: Dir.East, cold: true, glint: true, tookRelic: false });
    expect(a.title).toBe("East. Cold and Glint.");
    expect(a.flavor).toBe("Frost on your sleeve, and gold close by.");
    const b = logEntry({ step: 7, dir: Dir.East, cold: true, glint: false, tookRelic: true });
    expect(b.title).toBe("East. Relic taken. Cold.");
    expect(b.flavor).toBe("You pocket it. The slabs feel thin here.");
    expect(logEntry({ step: 1, dir: 0, cold: false, glint: false, tookRelic: false }).flavor).toBe("Only the wind.");
  });
});

describe("ux log and endings", () => {
  it("names a wall bump and a fall in the journey log", () => {
    const wall = logEntry({ step: 1, dir: 0, cold: false, glint: false, tookRelic: false, bumped: true });
    expect(wall.title).toBe("North. Wall. Quiet.");
    expect(wall.flavor).toBe("Cold stone. The step is spent.");
    const fall = logEntry({ step: 2, dir: 3, cold: true, glint: false, tookRelic: false, fell: true });
    expect(fall.title).toBe("East. You fell. Cold.");
    expect(fall.flavor).toContain("Nobody on the chain can tell");
  });

  it("separates finishing early from running out of oil", async () => {
    const { analyze, endingLabel } = await import("./reveal");
    const mk = (dirs: number[]) => analyze({ hazards: 0n, prizes: 0n, dirs, score: 0 });
    expect(endingLabel(mk([3, 2]))).toBe("Home alive");
    expect(endingLabel(mk([3]))).toBe("Away from the gate");
    expect(endingLabel(mk(Array(24).fill(3)))).toBe("Out of oil");
    expect(endingLabel(analyze({ hazards: 4n, prizes: 0n, dirs: [3, 3], score: 0 }))).toBe("Lost in the storm");
  });
});

describe('leaderboard helpers', () => {
  it('marks and finds the best run of a wallet', async () => {
    const { markMine, bestOf } = await import('./leaderboard');
    const rows = [
      { runId: '1', player: '0xAbC', score: 3, steps: 20 },
      { runId: '2', player: '0xdef', score: 5, steps: 24 },
      { runId: '3', player: '0xabc', score: 3, steps: 14 },
    ];
    expect(markMine(rows, '0xABC').map((r) => r.mine)).toEqual([true, false, true]);
    expect(markMine(rows, null).every((r) => !r.mine)).toBe(true);
    expect(bestOf(rows, '0xabc')?.runId).toBe('3');
    expect(bestOf(rows, '0x999')).toBeNull();
    expect(bestOf(rows, null)).toBeNull();
  });
});

describe("3d world", () => {
  it("height depends only on the cell and stays in a sane range", async () => {
    const { heightOf } = await import("./world3d");
    expect(heightOf.length).toBe(1);
    for (let c = 0; c < 64; c++) {
      const h = heightOf(c);
      expect(h).toBeGreaterThan(0.2);
      expect(h).toBeLessThan(1.3);
      expect(heightOf(c)).toBe(h);
    }
  });

  it("states follow the fog rules and reveal opens everything", async () => {
    const { tileState } = await import("./world3d");
    const visited = new Set([0, 1]);
    expect(tileState(1, 1, visited, false)).toBe("current");
    expect(tileState(0, 1, visited, false)).toBe("gate");
    expect(tileState(9, 1, visited, false)).toBe("neighbor");
    expect(tileState(2, 1, visited, false)).toBe("neighbor");
    expect(tileState(10, 1, visited, false)).toBe("unknown");
    expect(tileState(10, 1, visited, true)).toBe("reveal");
  });

  it("converts cells to world positions and scales the pixels", async () => {
    const { worldX, worldZ, pixelScale, trailDots } = await import("./world3d");
    expect(worldX(0)).toBe(-3.5);
    expect(worldZ(63)).toBe(3.5);
    expect(pixelScale(576)).toBe(3);
    expect(pixelScale(300)).toBe(2);
    expect(pixelScale(1200)).toBe(4);
    expect(trailDots([0, 1, 1, 9])).toHaveLength(4);
  });
});
