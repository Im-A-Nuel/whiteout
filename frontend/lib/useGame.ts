"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Driver, Reveal, StepResult } from "./driver";
import { MAX_MOVES } from "./engine";
import { chapterOf, logEntry, type LogEntry } from "./journey";
import { col, row } from "./zones";

export type Phase = "starting" | "playing" | "finishing" | "finalizing" | "revealed" | "failed";
export type Mark = 0 | 1 | 2; // none, pit flag, question mark

export interface GameState {
  phase: Phase;
  runId: string;
  moves: number;
  cells: number[]; // visited cells in order, starting at the gate
  pos: number; // shown position (predicted until the decrypt lands)
  dir: number | null; // last direction, for the sprite facing
  confirmed: StepResult | null;
  decrypting: boolean;
  alive: boolean;
  relics: number;
  taken: number[];
  log: LogEntry[];
  marks: Record<number, Mark>;
  txs: string[];
  reveal: Reveal | null;
  error: string | null;
  announce: string;
  /** Last relic pickup, for the sparkle burst. Not persisted. */
  pickup: { cell: number; id: number } | null;
}

const initial: GameState = {
  phase: "starting",
  runId: "",
  moves: 0,
  cells: [0],
  pos: 0,
  dir: null,
  confirmed: null,
  decrypting: false,
  alive: true,
  relics: 0,
  taken: [],
  log: [],
  marks: {},
  txs: [],
  reveal: null,
  error: null,
  announce: "",
  pickup: null,
};

/** Predicts the next cell from public rules only. It knows nothing about pits. */
export function predict(pos: number, dir: number): number {
  const r = row(pos);
  const c = col(pos);
  if (dir === 0) return r > 0 ? pos - 8 : pos;
  if (dir === 1) return r < 7 ? pos + 8 : pos;
  if (dir === 2) return c > 0 ? pos - 1 : pos;
  return c < 7 ? pos + 1 : pos;
}

const storeKey = (id: string) => `whiteout:run:${id}`;

function load(id: string): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(storeKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(s: GameState, persist: boolean) {
  if (!persist || !s.runId) return;
  try {
    const { cells, log, marks, taken, txs, moves } = s;
    localStorage.setItem(storeKey(s.runId), JSON.stringify({ cells, log, marks, taken, txs, moves }));
  } catch {
    /* storage can be unavailable, the run still works */
  }
}

export function useGame(driver: Driver, resume?: boolean) {
  const [s, setS] = useState<GameState>(initial);
  const stateRef = useRef(s);
  const busy = useRef(false);
  const queued = useRef<number | null>(null);
  const persist = driver.mode === "chain";

  const update = useCallback(
    (fn: (p: GameState) => GameState) => {
      setS((prev) => {
        const next = fn(prev);
        stateRef.current = next;
        save(next, persist);
        return next;
      });
    },
    [persist],
  );

  const begin = useCallback(async () => {
    update((p) => ({ ...p, phase: "starting", error: null }));
    try {
      const init = await driver.begin();
      const saved = resume ? load(init.runId) : null;
      update((p) => ({
        ...initial,
        ...(saved ?? {}),
        phase: "playing",
        runId: init.runId,
        confirmed: init.step0,
        pos: init.step0.pos,
        alive: init.step0.alive,
        relics: init.step0.collected,
        cells: saved?.cells?.length ? saved.cells : [init.step0.pos],
        marks: saved?.marks ?? {},
        log: saved?.log ?? [],
        taken: saved?.taken ?? [],
        txs: saved?.txs ?? [],
        moves: saved?.moves ?? 0,
        announce: "",
        reveal: p.reveal,
      }));
    } catch (e) {
      update((p) => ({ ...p, phase: "failed", error: describe(e) }));
    }
  }, [driver, resume, update]);

  useEffect(() => {
    void begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    async (dir: number) => {
      const cur = stateRef.current;
      if (cur.phase !== "playing" || cur.moves >= MAX_MOVES) return;
      busy.current = true;
      const from = cur.pos;
      const guess = predict(from, dir);
      update((p) => ({ ...p, pos: guess, dir, moves: p.moves + 1, decrypting: true, error: null, cells: [...p.cells, guess] }));
      try {
        const res = await driver.move(dir);
        update((p) => {
          const tookRelic = res.collected > p.relics;
          const mismatch = res.pos !== guess;
          const cells = [...p.cells.slice(0, -1), res.pos];
          const prevCh = new Set(p.cells.slice(0, -1).map(chapterOf));
          const ch = chapterOf(res.pos);
          const entering = !prevCh.has(ch);
          const entry = logEntry({
            step: p.moves,
            dir,
            cold: res.cold,
            glint: res.glint,
            tookRelic,
            chapter: entering ? ch : undefined,
            pushedBack: mismatch && res.alive,
          });
          const fell = p.alive && !res.alive;
          const parts = [res.cold ? "Cold." : "", res.glint ? "Glint." : "", entering ? "New chapter." : "", fell ? "You fell." : ""];
          return {
            ...p,
            pos: res.pos,
            cells,
            confirmed: res,
            decrypting: false,
            alive: res.alive,
            relics: res.collected,
            taken: tookRelic ? [...p.taken, res.pos] : p.taken,
            pickup: tookRelic ? { cell: res.pos, id: p.moves } : p.pickup,
            log: [entry, ...p.log],
            txs: res.txHash ? [res.txHash, ...p.txs].slice(0, 12) : p.txs,
            announce: parts.filter(Boolean).join(" ") || "Quiet.",
          };
        });
      } catch (e) {
        // roll the optimistic step back, the lantern is unchanged
        update((p) => ({
          ...p,
          pos: from,
          moves: Math.max(0, p.moves - 1),
          cells: p.cells.slice(0, -1),
          decrypting: false,
          error: describe(e),
        }));
      } finally {
        busy.current = false;
        const next = queued.current;
        queued.current = null;
        if (next !== null) void run(next);
      }
    },
    [driver, update],
  );

  const move = useCallback(
    (dir: number) => {
      if (busy.current) {
        queued.current = dir; // one pending input
        return;
      }
      void run(dir);
    },
    [run],
  );

  const finish = useCallback(async () => {
    if (stateRef.current.phase !== "playing") return;
    update((p) => ({ ...p, phase: "finishing", error: null }));
    try {
      const reveal = await driver.finish((ph) => update((p) => ({ ...p, phase: ph })));
      update((p) => ({ ...p, phase: "revealed", reveal }));
    } catch (e) {
      update((p) => ({ ...p, phase: "playing", error: describe(e) }));
    }
  }, [driver, update]);

  const toggleMark = useCallback(
    (cell: number) =>
      update((p) => {
        const next = (((p.marks[cell] ?? 0) + 1) % 3) as Mark;
        const marks = { ...p.marks };
        if (next === 0) delete marks[cell];
        else marks[cell] = next;
        return { ...p, marks };
      }),
    [update],
  );

  const dismissError = useCallback(() => update((p) => ({ ...p, error: null })), [update]);

  return { state: s, move, finish, toggleMark, dismissError, retry: begin };
}

function describe(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied|ACTION_REJECTED/i.test(msg)) return "You cancelled the wallet request.";
  if (/insufficient funds/i.test(msg)) return "This wallet has no Sepolia ETH for gas.";
  return msg.length > 140 ? msg.slice(0, 140) + "..." : msg;
}
