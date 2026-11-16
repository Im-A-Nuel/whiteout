"use client";

import { useEffect, useMemo, useState } from "react";
import type { Reveal } from "@/lib/driver";
import { analyze, ENDING_LABEL } from "@/lib/reveal";
import { renderCard } from "@/lib/shareCard";
import { cellLabel } from "@/lib/zones";
import { Board } from "./Board";
import { ChainView, JourneyRibbon } from "./Hud";
import { Icon, Panel, Pennants, PipRow, shortHash } from "./Pixel";
import type { ViewMode } from "./GameScreen";

const STEP_MS = 650;

function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

export function RevealScreen({
  reveal,
  runId,
  practice,
  trailLive,
  view,
  handles,
  txs,
}: {
  reveal: Reveal;
  runId: string;
  practice: boolean;
  trailLive: number[];
  view: ViewMode;
  handles?: { pos: string; alive: string; hazards: string };
  txs: string[];
}) {
  const a = useMemo(() => analyze(reveal), [reveal]);
  const total = reveal.dirs.length;
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(total);
  const [playing, setPlaying] = useState(false);
  const [shareMsg, setShareMsg] = useState<string>("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (idx >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => Math.min(total, i + 1)), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, idx, total]);

  // start the replay once, unless the visitor prefers reduced motion
  useEffect(() => {
    if (!reduced && total > 0) {
      setIdx(0);
      setPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const downloadCard = async () => {
    setSharing(true);
    setShareMsg("");
    try {
      const blob = await renderCard(a, { score: reveal.score, steps: total, runId, practice });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = practice ? "whiteout-practice.png" : `whiteout-run-${runId}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setShareMsg("Card saved. Attach it to your post.");
    } catch (e) {
      setShareMsg(e instanceof Error ? e.message : "Could not make the card.");
    } finally {
      setSharing(false);
    }
  };
  const postText = practice
    ? `I scored ${reveal.score} in a Whiteout practice run. Fog of war where the chain can’t see you die.`
    : `Run No. ${runId} in Whiteout: ${reveal.score} relics, ${total} of 24 steps. My position, moves and death stayed encrypted onchain until the end. Built on Zama FHEVM.`;
  const postUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText + " " + (typeof window !== "undefined" ? window.location.origin : ""))}`;

  const trail = a.cells.slice(0, idx + 1);
  const taken = a.takenAt.filter((t) => t.step <= idx).map((t) => t.cell);
  const takenSet = new Set(taken);
  const stillThere = a.prizes.filter((c) => !takenSet.has(c));
  const dead = a.deathStep !== null && idx >= a.deathStep;
  const pos = a.cells[idx];
  const visited = new Set(a.cells);
  const missed = a.prizes.filter((c) => !a.takenAt.some((t) => t.cell === c));
  const stamp = ENDING_LABEL[a.ending];
  const onChain = !practice && !!reveal.finalizeTx;

  const body =
    a.ending === "home"
      ? `Back at the gate with ${a.relics} ${a.relics === 1 ? "relic" : "relics"} and ${a.oilLeft} steps of oil left.`
      : a.ending === "lost"
        ? `You fell on a pit at ${cellLabel(a.cells[a.deathStep ?? 0])}. The score is zero.`
        : `You finished away from the gate with ${a.relics} ${a.relics === 1 ? "relic" : "relics"}. The score is zero.`;

  return (
    <main className="row main">
      {view !== "chain" && (
        <div className="col-l">
          <Panel label="Result">
            <div className="h2">Score</div>
            <div className="row" style={{ alignItems: "center", gap: 16, marginTop: 6 }}>
              <span style={{ fontSize: 112, fontWeight: 700, lineHeight: 1, textShadow: "6px 6px 0 var(--red)" }}>{String(reveal.score).padStart(2, "0")}</span>
            </div>
            <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {Array.from({ length: reveal.score }, (_, i) => (
                <Icon key={i} name="relicIcon" size={48} />
              ))}
            </div>
            <div className={`stamp${a.ending === "home" ? "" : " alt"}`}>{stamp}</div>
            <div className="sub" style={{ marginTop: 8 }}>{body}</div>
          </Panel>

          <Panel label="Run facts">
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: 16, alignItems: "baseline" }}>
              <span className="muted">Steps used</span>
              <b style={{ fontWeight: 600 }}>{total} of 24</b>
              <span className="muted">Missed</span>
              <b style={{ fontWeight: 600 }}>{missed.length ? missed.map(cellLabel).join(", ") : "None"}</b>
              <span className="muted">Closest call</span>
              <b style={{ fontWeight: 600 }}>{a.closeCall ?? "No pit came near"}</b>
            </div>
          </Panel>

          <Panel label="Replay">
            <div className="h2">Replay</div>
            <PipRow total={Math.max(total, 1)} on={idx} label={`Replay at ${idx} of ${total}`} white cols={Math.min(14, Math.max(total, 1))} gap={4} />
            <div className="row" style={{ gap: 2, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn alt key" style={{ width: 48, height: 48 }} aria-label="Back one step" onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sprites/arrow.png" alt="" style={{ transform: "rotate(270deg)" }} />
              </button>
              <button type="button" className="btn" style={{ padding: "10px 12px", fontSize: 16 }} onClick={() => { setIdx(0); setPlaying(true); }}>
                Play again
              </button>
              <button type="button" className="btn alt key" style={{ width: 48, height: 48 }} aria-label="Forward one step" onClick={() => { setPlaying(false); setIdx((i) => Math.min(total, i + 1)); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sprites/arrow.png" alt="" style={{ transform: "rotate(90deg)" }} />
              </button>
            </div>
            <div className="sub" style={{ marginTop: 6 }}>Runs in your browser. Nothing is sent.</div>
          </Panel>

          <Panel label="Share">
            <div className="h2">Share this run</div>
            <div className="sub" style={{ marginTop: 4 }}>The card is drawn in your browser from the revealed map.</div>
            <div className="row" style={{ gap: 4, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn sm" disabled={sharing} onClick={() => void downloadCard()}>{sharing ? "Drawing..." : "Download card"}</button>
              <a className="btn sm alt" href={postUrl} target="_blank" rel="noreferrer">Post on X</a>
            </div>
            <div className="sub" role="status" style={{ marginTop: 6 }}>{shareMsg}</div>
          </Panel>
        </div>
      )}

      {view !== "chain" && (
        <div className="col-c">
          <JourneyRibbon cells={a.cells} current={a.finalCell} revealed />
          <Pennants />
          <Board
            trail={trail.length ? trail : trailLive}
            pos={pos}
            dir={idx > 0 ? reveal.dirs[idx - 1] : null}
            taken={taken}
            liftFog
            reveal={{ pits: a.pits, missed: stillThere, cairn: dead ? pos : null, hideSprite: dead }}
          />
          <div className="row legend">
            <span className="row" style={{ gap: 8, alignItems: "center" }}><span style={{ width: 12, height: 12, background: "var(--path)", boxShadow: "0 0 0 2px var(--outline)" }} />Your path</span>
            <span className="row" style={{ gap: 8, alignItems: "center" }}><span style={{ width: 16, height: 16, background: "#0a0b1a", boxShadow: "0 0 0 2px var(--ice)" }} />Pit</span>
            <span className="row" style={{ gap: 8, alignItems: "center" }}><Icon name="relicIcon" size={16} />Taken</span>
            <span className="row" style={{ gap: 8, alignItems: "center" }}><span style={{ width: 16, height: 16, background: "var(--gold)", boxShadow: "0 0 0 2px var(--outline)" }} />Missed relic</span>
          </div>
          <div className="sub" style={{ marginTop: 10, maxWidth: "60ch" }}>
            {practice
              ? "This was a practice run, so the map was never encrypted. Real runs keep it sealed until you finish."
              : "The fog is gone because finishing opened the map. Every tile here comes from values you can check on Sepolia."}
          </div>
          <div className="sub" style={{ marginTop: 6 }}>{visited.size} cells walked.</div>
        </div>
      )}

      <div className="col-r" style={view === "chain" ? { width: "min(100%, 640px)" } : undefined}>
        {!practice && (
          <>
            <Panel label="Check the run">
              <div className="h2">Check the run</div>
              <ol className="steps-list">
                {[
                  ["Finish opens the map", "The contract marks the map, path and score as public."],
                  ["The network signs the values", "The Zama KMS decrypts them and signs the result."],
                  ["The contract checks it", "finalize() verifies the signatures before storing anything."],
                ].map(([t, d], i) => (
                  <li key={t}>
                    <span className="num done">{i + 1}</span>
                    <span><b style={{ fontWeight: 600 }}>{t}</b><br /><span className="sub">{d}</span></span>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel stone label="Revealed values">
              <div className="h2">Revealed values</div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", marginTop: 10, alignItems: "baseline" }}>
                <span className="muted">Pits</span><span className="hash">0x{reveal.hazards.toString(16).padStart(16, "0")}</span>
                <span className="muted">Relics</span><span className="hash">0x{reveal.prizes.toString(16).padStart(16, "0")}</span>
                <span className="muted">Moves</span><b style={{ fontWeight: 600 }}>{total}</b>
                <span className="muted">Finalize tx</span><span className="hash">{shortHash(reveal.finalizeTx) || "see Etherscan"}</span>
              </div>
              {onChain && (
                <a className="btn sm alt" style={{ marginTop: 14 }} href={`https://sepolia.etherscan.io/tx/${reveal.finalizeTx}`} target="_blank" rel="noreferrer">
                  Open on Etherscan
                </a>
              )}
            </Panel>
            <ChainView
              runId={runId || "0"}
              you={{ cell: cellLabel(a.finalCell), alive: a.ending === "lost" ? "No" : "Yes", pits: `${a.pits.length} pits` }}
              handles={handles}
              txs={txs}
              expanded={view === "chain"}
            />
          </>
        )}
        <a className="btn" href={practice ? "/practice" : "/"} style={{ alignSelf: "flex-start" }}>
          {practice ? "Practice again" : "Back to start"}
        </a>
      </div>
    </main>
  );
}
