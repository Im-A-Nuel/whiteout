"use client";

import type { CSSProperties } from "react";
import { cellLabel, col, decor, pitKey, row, tileKey } from "@/lib/zones";
import type { Mark } from "@/lib/useGame";
import { Pilgrim } from "./Pixel";

export interface BoardProps {
  /** Cells the pilgrim has stood on, oldest first. The last one is the current cell. */
  trail: number[];
  pos: number;
  dir: number | null;
  cold?: boolean;
  glint?: boolean;
  marks?: Record<number, Mark>;
  taken?: number[];
  onCell?: (cell: number) => void;
  /** Present only after the run is finalized. The play view never receives hazard data. */
  reveal?: { pits: number[]; missed: number[]; cairn?: number | null; hideSprite?: boolean };
  /** Replay: path drawn up to here. */
  replay?: boolean;
  fogless?: boolean;
  /** Sparkle burst at the cell where a relic was just taken. Change `id` to replay it. */
  burst?: { cell: number; id: number } | null;
  /** Reveal only: fade the fog out instead of dropping it at once. */
  liftFog?: boolean;
  /** The pilgrim fell on a pit. Only the player knows this before Finish. */
  fallen?: boolean;
}

const px = (n: number): string => `calc(var(--s) * ${n})`;

function glowStyle(cell: number): CSSProperties {
  const cx = col(cell) * 16 + 8;
  const cy = row(cell) * 16 + 8;
  const at = `circle at ${px(cx)} ${px(cy)}`;
  return {
    background: `radial-gradient(${at}, rgba(255,181,71,.15) 0 ${px(20)}, rgba(255,181,71,.085) ${px(20)} ${px(34)}, rgba(255,181,71,.035) ${px(34)} ${px(50)}, transparent ${px(50)})`,
  };
}

function trailDots(trail: number[]): { x: number; y: number }[] {
  const dots: { x: number; y: number }[] = [];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    if (a === b) continue;
    const ax = col(a) * 16 + 8;
    const ay = row(a) * 16 + 8;
    const dx = col(b) * 16 + 8 - ax;
    const dy = row(b) * 16 + 8 - ay;
    const len = Math.max(Math.abs(dx), Math.abs(dy));
    for (let k = 0; k < len; k += 8) dots.push({ x: ax + (dx * k) / len, y: ay + (dy * k) / len });
  }
  return dots;
}

export function Board(p: BoardProps) {
  const { trail, pos, dir, cold, glint, marks = {}, taken = [], onCell, reveal } = p;
  const visited = new Set(trail);
  const neighbors = new Set<number>();
  const r = row(pos);
  const c = col(pos);
  if (r > 0) neighbors.add(pos - 8);
  if (r < 7) neighbors.add(pos + 8);
  if (c > 0) neighbors.add(pos - 1);
  if (c < 7) neighbors.add(pos + 1);
  const pits = new Set(reveal?.pits ?? []);
  const missed = new Set(reveal?.missed ?? []);
  const takenSet = new Set(taken);
  const horizontal = dir === 2 || dir === 3;

  return (
    <div className="frame">
      <div className="snowcap" />
      <div className="boardin" role="group" aria-label="Temple board">
        {Array.from({ length: 64 }, (_, cell) => {
          const key = reveal && pits.has(cell) ? pitKey(cell) : tileKey(cell);
          const deco = decor(cell);
          const showDeco = deco && !(reveal && (pits.has(cell) || missed.has(cell)));
          const isGate = cell === 0;
          let state = "unk";
          if (reveal || isGate || cell === pos) state = "";
          else if (visited.has(cell)) state = "dim";
          else if (neighbors.has(cell)) state = "nb";
          const mark = marks[cell] ?? 0;
          const interactive = !!onCell && !reveal && !isGate && cell !== pos;
          const style: CSSProperties = {
            left: px(col(cell) * 16),
            top: px(row(cell) * 16),
            backgroundImage: `url(/sprites/${isGate ? "gate" : key}.png)`,
          };
          const content = (
            <>
              {showDeco && <div className="ov" style={{ backgroundImage: `url(/sprites/${deco}.png)` }} />}
              {reveal && missed.has(cell) && <div className="ov" style={{ backgroundImage: "url(/sprites/relicOver.png)" }} />}
              {!reveal && state === "nb" && <div className="ov ov-hint" />}
              {mark === 1 && <div className="ov" role="img" aria-label="Marked as pit" style={{ backgroundImage: "url(/sprites/flagOver.png)" }} />}
              {mark === 2 && <div className="ov" role="img" aria-label="Marked with a question" style={{ backgroundImage: "url(/sprites/qOver.png)" }} />}
              {takenSet.has(cell) && <div className="taken" role="img" aria-label="Relic taken" />}
            </>
          );
          const cls = `t ${state}${interactive ? " cell-btn" : ""}`;
          const aria = `${cellLabel(cell)}${isGate ? ", Gate" : ""}`;
          return interactive ? (
            <button key={cell} type="button" className={cls} style={style} aria-label={`${aria}. Cycle note`} onClick={() => onCell!(cell)}>
              {content}
            </button>
          ) : (
            <div key={cell} className={cls} style={style} {...(isGate || takenSet.has(cell) ? { role: "img", "aria-label": aria + (takenSet.has(cell) ? ", relic taken" : "") } : { "aria-hidden": true })}>
              {content}
            </div>
          );
        })}

        {trailDots(trail).map((d, i) => (
          <span key={i} className="dot" style={{ left: px(d.x - 1), top: px(d.y - 1) }} />
        ))}

        {!reveal && <div className="glow" style={glowStyle(pos)} />}

        {reveal?.cairn != null && <div className="cairn" role="img" aria-label="Where the run ended" style={{ left: px(col(reveal.cairn) * 16), top: px(row(reveal.cairn) * 16) }} />}
        {!reveal?.hideSprite && (
          <Pilgrim
            variant={pos === 0 && trail.length <= 1 ? "down" : dir === 0 ? "up" : horizontal ? "side" : "down"}
            flip={dir === 2}
            bob={trail.length <= 1}
            className={`walk${p.fallen ? " fallen" : ""}`}
            style={{ left: px(col(pos) * 16), top: px(row(pos) * 16) }}
          />
        )}

        {p.burst && !reveal && (
          <div key={p.burst.id} className="burst" aria-hidden="true" style={{ left: px(col(p.burst.cell) * 16), top: px(row(p.burst.cell) * 16) }}>
            {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} />)}
          </div>
        )}
        {reveal && p.liftFog && (
          <>
            <div className="fogdrift fogA fogLift" />
            <div className="fogdrift fogB fogLift" />
          </>
        )}
        {glint && !reveal && (
          <>
            <span className="spark" style={{ left: px(col(pos) * 16 - 4), top: px(row(pos) * 16 + 3) }} />
            <span className="spark" style={{ left: px(col(pos) * 16 + 19), top: px(row(pos) * 16 + 2), animationDelay: "0.5s" }} />
            <span className="spark" style={{ left: px(col(pos) * 16 + 18), top: px(row(pos) * 16 + 15), animationDelay: "1s" }} />
          </>
        )}
        {cold && !reveal && <div className="frost" />}
        {!reveal && !p.fogless && (
          <>
            <div className="fogdrift fogA" />
            <div className="fogdrift fogB" />
          </>
        )}
        <div className="snow snowA board-snow" style={{ opacity: 0.35 }} />
      </div>
      <div className="brazier" style={{ left: px(-5), top: px(-9) }} />
      <div className="brazier" style={{ right: px(-5), top: px(-9) }} />
      <div className="brazier" style={{ left: px(-5), bottom: px(-5) }} />
      <div className="brazier" style={{ right: px(-5), bottom: px(-5) }} />
    </div>
  );
}
