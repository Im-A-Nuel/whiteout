"use client";

import { CHAPTERS, chapterOf, chaptersReached, type LogEntry } from "@/lib/journey";
import { MAX_MOVES } from "@/lib/engine";
import { cellLabel, col, row } from "@/lib/zones";
import { Icon, Panel, Pilgrim, PipRow, shortHash } from "./Pixel";

export function LanternPanel({ moves }: { moves: number }) {
  const left = MAX_MOVES - moves;
  return (
    <Panel label="Lantern oil" className="lantern-panel">
      <div className="row lantern-head" style={{ alignItems: "center", gap: 14 }}>
        <Icon name="lantern" size={48} />
        <div>
          <div className="h2">Lantern oil</div>
          <div className="sub">Each step burns one.</div>
        </div>
      </div>
      <div className="row" style={{ alignItems: "baseline", gap: 10, marginTop: 14 }}>
        <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, textShadow: "4px 4px 0 var(--outline)" }} aria-label={`${left} of ${MAX_MOVES} steps left`}>
          {left}
        </span>
        <span className="muted" style={{ fontSize: 18 }}>
          of {MAX_MOVES} left
        </span>
      </div>
      <PipRow total={MAX_MOVES} on={left} label={`${left} of ${MAX_MOVES} steps left`} />
    </Panel>
  );
}

export function PackPanel({ relics, pos, alive, dead }: { relics: number; pos: number; alive: boolean; dead: boolean }) {
  const dist = row(pos) + col(pos);
  return (
    <Panel label="Pack">
      <div className="h2">Pack</div>
      <div className="row" style={{ gap: 6, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        {Array.from({ length: relics }, (_, i) => (
          <Icon key={i} name="relicIcon" size={48} />
        ))}
        <span style={{ marginLeft: 6, fontSize: 18 }}>
          {relics} {relics === 1 ? "relic" : "relics"}
        </span>
      </div>
      <div className="sub" style={{ marginTop: 12 }}>
        The gate at A1 is {dist} {dist === 1 ? "step" : "steps"} away. Relics count only if you finish alive at the gate.
      </div>
      <div className="row" style={{ gap: 10, alignItems: "center", marginTop: 12 }}>
        <Icon name="lock" size={16} />
        <span style={{ fontSize: 16 }}>{alive && !dead ? "Alive" : "You fell"}</span>
        <span className="sub">only you can tell</span>
      </div>
    </Panel>
  );
}

export function SignalsPanel({ pos, cold, glint, decrypting }: { pos: number; cold: boolean; glint: boolean; decrypting: boolean }) {
  return (
    <Panel label={`Signals at ${cellLabel(pos)}`}>
      <div className="h2">Signals at {cellLabel(pos)}</div>
      <div className="sub">Decrypted just for you.</div>
      <div className={`signal cold${cold && !decrypting ? "" : " off"}`}>
        <Icon name="coldIcon" size={48} />
        <div>
          <div className="lbl" style={{ color: "#BFE3F8" }}>Cold</div>
          <div className={`sub${decrypting ? " pulse" : ""}`}>{decrypting ? "Reading the wind..." : cold ? "A pit is next to you" : "Nothing here"}</div>
        </div>
      </div>
      <div className={`signal glint${glint && !decrypting ? "" : " off"}`}>
        <Icon name="glintIcon" size={48} />
        <div>
          <div className="lbl" style={{ color: "#FFD98A" }}>Glint</div>
          <div className={`sub${decrypting ? " pulse" : ""}`}>{decrypting ? "Reading the wind..." : glint ? "Treasure is next to you" : "Nothing here"}</div>
        </div>
      </div>
    </Panel>
  );
}

export function JourneyRibbon({
  cells,
  current,
  revealed,
}: {
  cells: number[];
  current: number;
  revealed?: boolean;
}) {
  const reached = chaptersReached(cells);
  const cur = chapterOf(current);
  const title = revealed ? `Reached ${reached.size} of 5 chapters` : `Chapter ${cur + 1} of 5`;
  const subtitle = revealed ? (reached.size === 5 ? "You crossed the whole road" : "The rest of the road stayed unseen") : "Where this road has led you so far";
  return (
    <Panel label="Journey" className="ribbon" style={{ padding: "12px 16px 14px", marginBottom: 22 }}>
      <div className="row" style={{ alignItems: "baseline", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
        <span className="h2">{title}</span>
        <span className="sub">{subtitle}</span>
      </div>
      <div className="row ribbon-row" style={{ alignItems: "flex-start", marginTop: 30, padding: "0 2px" }}>
        {CHAPTERS.map((ch, i) => {
          const isCur = !revealed && i === cur;
          const isReached = reached.has(i);
          const nextLit = isReached && (reached.has(i + 1) || (!revealed && i + 1 === cur));
          return (
            <div key={ch.name} style={{ display: "contents" }}>
              <div className={`node${isCur ? " current" : ""}${isReached ? "" : " locked"}`}>
                {isCur && <Pilgrim variant="down" bob className="mini" />}
                <div className="tile">
                  <Icon name={ch.tile} size={40} />
                </div>
                <span className="name" style={{ color: isCur ? "var(--amber)" : isReached ? "var(--text)" : "#8C99C0", fontWeight: isCur ? 600 : 400 }}>
                  {ch.name}
                </span>
              </div>
              {i < CHAPTERS.length - 1 && (
                <div className="rib-dots" style={{ marginTop: 26, background: `repeating-linear-gradient(90deg, ${nextLit ? "var(--amber)" : "var(--panel-edge)"} 0 8px, transparent 8px 16px)` }} />
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function JourneyLog({ log, max = 3 }: { log: LogEntry[]; max?: number }) {
  const banner = log[0]?.chapter != null ? log[0] : null;
  return (
    <Panel label="Journey log">
      <div className="h2">Journey log</div>
      <div className="sub">Your notes. They stay in this browser.</div>
      {banner && banner.chapter != null && (
        <div className="banner">
          <Icon name={CHAPTERS[banner.chapter].tile} size={32} style={{ boxShadow: "0 0 0 4px var(--outline)" }} />
          <span>
            <span className="sub" style={{ color: "#FFD98A" }}>Chapter {banner.chapter + 1}, step {banner.step}</span>
            <br />
            <b style={{ fontWeight: 600 }}>You enter the {CHAPTERS[banner.chapter].name}</b>
          </span>
        </div>
      )}
      {log.length === 0 ? (
        <div className="sub" style={{ marginTop: 14 }}>No steps yet. Choose a direction. Each step is a private transaction.</div>
      ) : (
        <ol style={{ listStyle: "none", margin: "6px 0 0", padding: 0, maxHeight: banner ? 3 * 78 : 4 * 78, overflowY: "auto" }} tabIndex={0} aria-label="Journey entries, newest first">
          {log.slice(0, Math.max(max, 12)).map((e) => (
            <li key={e.step} className="logrow">
              <span className="amber" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{String(e.step).padStart(2, "0")}</span>
              <span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{e.title}</span>
                <br />
                <span className="sub">{e.flavor}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function ChainView({
  runId,
  you,
  handles,
  txs,
  expanded,
}: {
  runId: string;
  you: { cell: string; alive: string; pits: string };
  handles?: { pos: string; alive: string; hazards: string };
  txs: string[];
  expanded?: boolean;
}) {
  const rows: [string, string, string | undefined][] = [
    ["Where am I?", you.cell, handles?.pos],
    ["Am I alive?", you.alive, handles?.alive],
    ["Where are the pits?", you.pits, handles?.hazards],
  ];
  return (
    <Panel stone label="Chain view">
      <div className="h2">Chain view</div>
      <div className="sub">What an explorer sees for run No. {runId.padStart(4, "0")}.</div>
      <div className="chain-row" style={{ marginTop: 12, paddingTop: 0, paddingBottom: 6 }}>
        <span className="sub">Question</span>
        <span className="sub">You</span>
        <span className="sub">Chain</span>
      </div>
      {rows.map(([q, y, h]) => (
        <div className="chain-row" key={q}>
          <span style={{ fontSize: 15 }}>{q}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{y}</span>
          <span className="row" style={{ alignItems: "center", gap: 6, minWidth: 0 }}>
            <Icon name="lock" size={12} />
            <span className="hash" style={{ overflowWrap: "anywhere" }} title={h}>{expanded ? h ?? "not yet read" : shortHash(h) || "not yet read"}</span>
          </span>
        </div>
      ))}
      <div className="sub" style={{ marginTop: 10 }}>Same call every step. Nothing here says which way I went or whether I am alive.</div>
      {expanded && (
        <>
          <div className="h2" style={{ fontSize: 18, marginTop: 18 }}>Last transactions</div>
          {txs.length === 0 ? (
            <div className="sub" style={{ marginTop: 6 }}>No step taken yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {txs.map((t) => (
                <li key={t} className="row" style={{ gap: 12, padding: "6px 0", borderTop: "4px solid var(--outline)", alignItems: "baseline", flexWrap: "wrap" }}>
                  <span className="hash">{shortHash(t)}</span>
                  <span className="sub">move(bytes32, bytes), emits Moved</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
