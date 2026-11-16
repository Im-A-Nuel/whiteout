import type { CSSProperties } from "react";
import { col, decor, pitKey, row, tileKey } from "@/lib/zones";
import { Icon, Pilgrim } from "./Pixel";

/**
 * A 4 x 4 corner of the real board, drawn with the game's own tiles. It is an illustration with fixed,
 * made-up positions, not a real run. Three modes show the same board from three points of view.
 */
export type MiniMode = "chain" | "you" | "reveal";

const COLS = 4;
const ROWS = 4;
const cellOf = (r: number, c: number) => r * 8 + c; // a window onto the real 8 x 8 board
const PITS = new Set([cellOf(1, 2), cellOf(3, 1)]);
const RELICS = new Set([cellOf(0, 3), cellOf(2, 3), cellOf(3, 3)]);
const PATH = [cellOf(0, 0), cellOf(0, 1), cellOf(0, 2), cellOf(0, 3), cellOf(1, 3), cellOf(2, 3), cellOf(2, 2), cellOf(2, 1), cellOf(1, 1), cellOf(1, 0), cellOf(0, 0)];
const YOU = cellOf(1, 1);
const VISITED = new Set([cellOf(0, 0), cellOf(0, 1), cellOf(1, 1)]);
const NEIGHBORS = new Set([cellOf(1, 0), cellOf(2, 1), cellOf(1, 2)]);
const TAKEN = new Set([cellOf(0, 3), cellOf(2, 3)]);

const px = (n: number): string => `calc(var(--s) * ${n})`;
const at = (cell: number): CSSProperties => ({ left: px(col(cell) * 16), top: px(row(cell) * 16) });

function dots(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < PATH.length; i++) {
    const a = PATH[i - 1];
    const b = PATH[i];
    const ax = col(a) * 16 + 8;
    const ay = row(a) * 16 + 8;
    const dx = col(b) * 16 + 8 - ax;
    const dy = row(b) * 16 + 8 - ay;
    const len = Math.max(Math.abs(dx), Math.abs(dy));
    for (let k = 0; k < len; k += 8) out.push({ x: ax + (dx * k) / len, y: ay + (dy * k) / len });
  }
  return out;
}

export function MiniBoard({ mode, label }: { mode: MiniMode; label: string }) {
  const cells: number[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push(cellOf(r, c));

  return (
    <div className="miniboard" role="img" aria-label={label} style={{ ["--s" as string]: "3px" } as CSSProperties}>
      {cells.map((c) => {
        const reveal = mode === "reveal";
        const pit = reveal && PITS.has(c);
        let state = "";
        if (mode === "chain") state = "unk";
        else if (mode === "you") state = c === YOU || c === 0 ? "" : VISITED.has(c) ? "dim" : NEIGHBORS.has(c) ? "nb" : "unk";
        const key = c === 0 ? "gate" : pit ? pitKey(c) : tileKey(c);
        const deco = decor(c);
        return (
          <div key={c} className={`t ${state}`} style={{ ...at(c), backgroundImage: `url(/sprites/${key}.png)` }}>
            {deco && !pit && !(reveal && RELICS.has(c)) && mode !== "chain" && <div className="ov" style={{ backgroundImage: `url(/sprites/${deco}.png)` }} />}
            {reveal && RELICS.has(c) && !TAKEN.has(c) && <div className="ov" style={{ backgroundImage: "url(/sprites/relicOver.png)" }} />}
            {reveal && TAKEN.has(c) && <div className="taken" />}
            {mode === "you" && state === "nb" && <div className="ov ov-hint" />}
          </div>
        );
      })}

      {mode === "reveal" &&
        dots().map((d, i) => <span key={i} className="dot" style={{ left: px(d.x - 1), top: px(d.y - 1) }} />)}

      {mode === "you" && <Pilgrim variant="down" bob still className="mini-pil" style={{ ...at(YOU), position: "absolute" }} />}
      {mode === "reveal" && <Pilgrim variant="down" still className="mini-pil" style={{ ...at(0), position: "absolute" }} />}

      {mode === "chain" && (
        <>
          <div className="fogdrift fogA" style={{ animation: "none", opacity: 0.75 }} />
          <div className="mini-lock">
            <Icon name="lock" size={32} />
          </div>
        </>
      )}
      {mode === "you" && <div className="frost" style={{ animation: "none", opacity: 0.8 }} />}
    </div>
  );
}
