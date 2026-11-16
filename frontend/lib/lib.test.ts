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
