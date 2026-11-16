"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Driver } from "@/lib/driver";
import { MAX_MOVES } from "@/lib/engine";
import { predict } from "@/lib/useGame";
import { useGame } from "@/lib/useGame";
import { CHAPTERS } from "@/lib/journey";
import { loadSoundPref, setSound, sfx } from "@/lib/sound";
import { cellLabel, col, row } from "@/lib/zones";
import { Board } from "./Board";
import { ChainView, JourneyLog, JourneyRibbon, LanternPanel, PackPanel, SignalsPanel } from "./Hud";
import { Icon, Panel, Pennants, Pilgrim, shortAddr } from "./Pixel";
import { FirstVisitHint, HowToPlayButton } from "./HowToPlay";
import { RevealScreen } from "./RevealScreen";

export type ViewMode = "split" | "you" | "chain";

export function Header({
  runId,
  practice,
  finalized,
  address,
  view,
  onView,
  chainOk = true,
  sound,
  onSound,
  simulated,
}: {
  runId?: string;
  practice?: boolean;
  finalized?: boolean;
  address?: string;
  view?: ViewMode;
  onView?: (v: ViewMode) => void;
  chainOk?: boolean;
  sound?: boolean;
  onSound?: () => void;
  simulated?: boolean;
}) {
  return (
    <header className="row hdr">
      <Link href="/" className="row" style={{ alignItems: "center", gap: 14, textDecoration: "none", color: "inherit" }}>
        <Pilgrim variant="down" still scale={3} style={{ position: "relative", width: 48, height: 48 }} />
        <span className="logo">Whiteout</span>
      </Link>
      {practice ? (
        <div className="panel" style={{ padding: "4px 14px", margin: "4px 4px 4px 10px", background: "#3a2a12", boxShadow: "0 -4px 0 0 #b8862b, 0 4px 0 0 #b8862b, -4px 0 0 0 #b8862b, 4px 0 0 0 #b8862b, 0 8px 0 0 var(--panel-drop)" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Practice run, nothing is encrypted</span>
        </div>
      ) : (
        runId && (
          <div className="panel" style={{ padding: "4px 14px", margin: "4px 4px 4px 10px" }}>
            <span className="muted" style={{ fontSize: 14 }}>Run</span> <span style={{ fontSize: 20, fontWeight: 700 }}>No. {runId.padStart(4, "0")}</span>
          </div>
        )
      )}
      {simulated && (
        <div className="panel" style={{ padding: "4px 14px", margin: 4, background: "#3a2a12", boxShadow: "0 -4px 0 0 #b8862b, 0 4px 0 0 #b8862b, -4px 0 0 0 #b8862b, 4px 0 0 0 #b8862b, 0 8px 0 0 var(--panel-drop)" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Simulated chain, nothing is on Sepolia</span>
        </div>
      )}
      {finalized && (
        <span className="panel good" style={{ padding: "4px 14px", margin: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Finalized</span>
        </span>
      )}
      <div style={{ flex: "1 1 0" }} />
      {view && onView && !practice && (
        <div className="row seg" role="group" aria-label="View">
          {(["split", "you", "chain"] as const).map((v) => (
            <button key={v} type="button" className={`btn sm ${view === v ? "on" : "alt"}`} aria-pressed={view === v} onClick={() => onView(v)}>
              {v === "split" ? "Split" : v === "you" ? "Your view" : "Chain view"}
            </button>
          ))}
        </div>
      )}
      <div className="row" style={{ alignItems: "center", gap: 12, fontSize: 14 }}>
        {!practice && !simulated && (
          <span className="row" style={{ alignItems: "center", gap: 8 }}>
            <span className={`dotnet${chainOk ? "" : " warn"}`} />
            Sepolia
          </span>
        )}
        {address && <span className="hash">{shortAddr(address)}</span>}
        <HowToPlayButton />
        {onSound && (
          <button type="button" className="btn sm alt sound-btn" aria-pressed={!!sound} aria-label={sound ? "Sound on" : "Sound off"} onClick={onSound}>
            {sound ? "Sound on" : "Sound off"}
          </button>
        )}
        <Link href="/leaderboard" className="btn sm alt">Leaderboard</Link>
      </div>
    </header>
  );
}

const ARROWS: { dir: number; rot: number; label: string }[] = [
  { dir: 0, rot: 0, label: "Move north" },
  { dir: 2, rot: 270, label: "Move west" },
  { dir: 1, rot: 180, label: "Move south" },
  { dir: 3, rot: 90, label: "Move east" },
];

export function DPad({ onMove, disabled, pos }: { onMove: (d: number) => void; disabled?: boolean; pos?: number }) {
  return (
    <div className="dpad" role="group" aria-label="Move">
      {ARROWS.map((a) => {
        const wall = pos !== undefined && predict(pos, a.dir) === pos;
        return (
        <button key={a.dir} type="button" className={`btn alt key k${a.dir}${wall ? " wall" : ""}`} aria-label={wall ? `${a.label}, wall, the step would be wasted` : a.label} title={wall ? "Wall: the step would be wasted" : undefined} disabled={disabled} onClick={() => onMove(a.dir)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sprites/arrow.png" alt="" style={{ transform: `rotate(${a.rot}deg)` }} />
        </button>
        );
      })}
    </div>
  );
}

export function GameScreen({ driver, address, resume }: { driver: Driver; address?: string; resume?: boolean }) {
  const { state: s, move, finish, toggleMark, clearMarks, dismissError, retryError, retry } = useGame(driver, resume);
  const [view, setView] = useState<ViewMode>("split");
  const [confirming, setConfirming] = useState(false);
  const [sound, setSoundState] = useState(false);
  const [card, setCard] = useState<{ ch: number; step: number } | null>(null);
  const prev = useRef({ moves: 0, relics: 0, cold: false, alive: true, phase: "starting" as string });
  const [sheet, setSheet] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);
  const swipe = useRef<{ x: number; y: number; done: boolean } | null>(null);
  const practice = driver.mode === "practice";
  const simulated = !!driver.simulated;
  const playing = s.phase === "playing";
  const out = s.moves >= MAX_MOVES;
  const dead = !s.alive;
  // the run is decided or over: nudge toward Finish
  const distHome = row(s.pos) + col(s.pos);
  const attn = playing && (dead || out || (s.pos !== 0 && MAX_MOVES - s.moves < distHome));

  const key = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const map: Record<string, number> = { ArrowUp: 0, w: 0, W: 0, ArrowDown: 1, s: 1, S: 1, ArrowLeft: 2, a: 2, A: 2, ArrowRight: 3, d: 3, D: 3 };
      if (e.key in map) {
        e.preventDefault();
        if (playing && !confirming) move(map[e.key]);
      } else if (e.key === "Enter" && playing && t?.tagName !== "BUTTON") {
        e.preventDefault();
        setConfirming(true);
      } else if (e.key === "Escape") {
        setConfirming(false);
        setSheet(false);
      }
    },
    [playing, confirming, move],
  );
  useEffect(() => {
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [key]);

  useEffect(() => setSoundState(loadSoundPref()), []);

  // a practice run lives only in this tab, so ask before it is lost
  useEffect(() => {
    if (!practice || s.phase !== "playing" || s.moves === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [practice, s.phase, s.moves]);

  // phones: bring the board into view once when the run starts, the lantern count lives in the dock
  useEffect(() => {
    if (s.phase !== "playing" || scrolled.current) return;
    scrolled.current = true;
    if (window.matchMedia("(max-width: 700px)").matches) boardRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [s.phase]);
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundState(next);
    if (next) sfx.step();
  };

  // sound and the chapter card follow decrypted state, never the hidden map
  useEffect(() => {
    const p = prev.current;
    if (s.moves > p.moves) sfx.step();
    if (s.relics > p.relics) sfx.relic();
    if (s.confirmed?.cold && !p.cold && !s.decrypting) sfx.cold();
    if (!s.alive && p.alive) sfx.fell();
    if (s.phase === "revealed" && p.phase !== "revealed") sfx.finish();
    const top = s.log[0];
    if (top && top.chapter != null && s.moves > p.moves) setCard({ ch: top.chapter, step: top.step });
    prev.current = { moves: s.moves, relics: s.relics, cold: !!s.confirmed?.cold && !s.decrypting, alive: s.alive, phase: s.phase };
  }, [s.moves, s.relics, s.confirmed, s.decrypting, s.alive, s.phase, s.log]);
  useEffect(() => {
    if (!card) return;
    const t = setTimeout(() => setCard(null), 2600);
    return () => clearTimeout(t);
  }, [card]);

  const you = useMemo(
    () => ({ cell: cellLabel(s.pos), alive: s.alive ? "Yes" : "No", pits: `${cellLabel(s.pos)} +` }),
    [s.pos, s.alive],
  );

  if (s.phase === "revealed" && s.reveal) {
    return (
      <div className="root" style={{ ["--s" as string]: "4px" }}>
        <div className="snow snowA" style={{ opacity: 0.55 }} />
        <Header runId={s.runId} practice={practice} finalized={!practice} address={address} view={view} onView={setView} sound={sound} onSound={toggleSound} simulated={simulated} />
        <RevealScreen
          reveal={s.reveal}
          runId={s.runId}
          practice={practice}
          simulated={simulated}
          trailLive={s.cells}
          view={view}
          handles={s.confirmed?.handles}
          txs={s.txs}
        />
      </div>
    );
  }

  const busyFinish = s.phase === "finishing" || s.phase === "finalizing";

  return (
    <div className="root">
      <div className="snow snowA" />
      <div className="snow snowB" />
      <Header runId={s.runId || undefined} practice={practice} address={address} view={view} onView={setView} sound={sound} onSound={toggleSound} simulated={simulated} />
      <div className="sr-only" aria-live="polite">{s.announce}</div>
      <FirstVisitHint />

      {s.phase === "starting" && (
        <div className="notice" role="status">
          <Icon name="lantern" size={36} />
          <b className="pulse">Lighting the lantern...</b>
        </div>
      )}
      {s.phase === "failed" && (
        <div className="notice" role="alert">
          <span>The run did not start. {s.error}</span>
          <button type="button" className="btn sm" onClick={() => void retry()}>Retry</button>
        </div>
      )}

      <main className="row main">
        {view !== "chain" && (
          <div className="col-l">
            <LanternPanel moves={s.moves} />
            <PackPanel relics={s.relics} pos={s.pos} alive={s.alive} dead={dead} />
            <SignalsPanel
              pos={s.pos}
              cold={!!s.confirmed?.cold}
              glint={!!s.confirmed?.glint}
              decrypting={s.decrypting || s.phase === "starting"}
            />
          </div>
        )}

        {view !== "chain" && (
          <div className="col-c" style={view === "you" ? { width: "min(100%, 640px)" } : undefined}>
            <JourneyRibbon cells={s.cells} current={s.pos} />
            <Pennants />
            <div
              ref={boardRef}
              className="boardwrap"
              onPointerDown={(e) => { if (e.pointerType === "touch") swipe.current = { x: e.clientX, y: e.clientY, done: false }; }}
              onPointerUp={(e) => {
                const st = swipe.current;
                swipe.current = null;
                if (!st || !playing || confirming) return;
                const dx = e.clientX - st.x;
                const dy = e.clientY - st.y;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 32) return;
                move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : dy > 0 ? 1 : 0);
                swipe.current = { x: 0, y: 0, done: true };
              }}
              onClickCapture={(e) => { if (swipe.current?.done) { swipe.current = null; e.stopPropagation(); e.preventDefault(); } }}
            >
            {card && (
              <div className="chapter-card" role="status">
                <div className="k">Chapter {card.ch + 1}, step {card.step}</div>
                <div className="n">{CHAPTERS[card.ch].name}</div>
              </div>
            )}
            <Board
              burst={s.pickup}
              fallen={dead}
              trail={s.cells}
              pos={s.pos}
              dir={s.dir}
              cold={!!s.confirmed?.cold && !s.decrypting}
              glint={!!s.confirmed?.glint && !s.decrypting}
              marks={s.marks}
              taken={s.taken}
              onCell={playing ? toggleMark : undefined}
            />
            </div>

            {s.error && playing && (
              <div className="errbox" role="alert">
                <div>{s.errorKind === "finish" ? "The run did not finish. Nothing was lost, your steps are kept." : "That step did not go through. Your lantern is unchanged."}</div>
                <div className="sub" style={{ marginTop: 4 }}>{s.error}</div>
                <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                  <button type="button" className="btn sm" onClick={retryError}>{s.errorKind === "finish" ? "Retry finish" : "Retry step"}</button>
                  <button type="button" className="btn sm alt" onClick={dismissError}>Dismiss</button>
                </div>
              </div>
            )}
            {dead && playing && (
              <div className="errbox" role="status">
                <b>You fell.</b> <span className="sub">Only you know. Steps still count and nobody on the chain can tell. Finish to open the map.</span>
              </div>
            )}
            {playing && !dead && !out && s.pos !== 0 && (() => {
              const left = MAX_MOVES - s.moves;
              const dist = row(s.pos) + col(s.pos);
              if (left > dist + 2) return null;
              return (
                <div className="warnbox" role="status">
                  {left < dist
                    ? `The gate is ${dist} steps away and you have ${left} steps of oil. You cannot get home in time, and finishing away from the gate scores zero.`
                    : `The gate is ${dist} steps away and you have ${left} steps of oil. Head home now.`}
                </div>
              );
            })()}
            {out && playing && <div className="sub" style={{ marginTop: 14 }}>The lantern is out. Finish the run to see the map.</div>}

            {confirming && playing ? (
              <div className="panel" style={{ marginTop: 22 }} role="alertdialog" aria-label="Finish run">
                <div className="h2">Finish this run?</div>
                <div className="sub" style={{ marginTop: 6 }}>
                  {s.pos === 0
                    ? `You are at the gate with ${s.relics} ${s.relics === 1 ? "relic" : "relics"}. Finishing opens the map for everyone.`
                    : "You are not at the gate. A run that finishes away from the gate scores zero. Finishing opens the map for everyone."}
                </div>
                <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" className="btn" autoFocus onClick={() => { setConfirming(false); void finish(); }}>Finish run</button>
                  <button type="button" className="btn alt" onClick={() => setConfirming(false)}>Keep walking</button>
                </div>
              </div>
            ) : (
              <div className="row dock" style={{ alignItems: "center", gap: 6, marginTop: 22, flexWrap: "wrap" }}>
                <DPad onMove={move} disabled={!playing || out} pos={s.pos} />
                <div style={{ flex: "1 1 0", minWidth: 12 }} />
                <div className="dock-actions">
                  <span className="mobile-only steps-chip" role="status" aria-label={`${MAX_MOVES - s.moves} of ${MAX_MOVES} steps left`}>{MAX_MOVES - s.moves} steps left</span>
                  {!practice && (
                    <button type="button" className="btn alt mobile-only" aria-haspopup="dialog" onClick={() => setSheet(true)}>Chain view</button>
                  )}
                  {busyFinish ? (
                    <button type="button" className="btn" disabled>{s.phase === "finishing" ? "Opening the map..." : "Checking the proof..."}</button>
                  ) : (
                    <button type="button" className={`btn${attn ? " attn" : ""}`} disabled={!playing} onClick={() => setConfirming(true)}>Finish run</button>
                  )}
                </div>
              </div>
            )}
            <div className="sub" role="status" aria-live="polite" style={{ marginTop: 10, minHeight: 20, color: "var(--amber)" }}>
              {s.decrypting ? (s.queued ? `Decrypting... ${s.queued} ${s.queued === 1 ? "step" : "steps"} queued.` : "Decrypting...") : ""}
            </div>
            <div className="sub" style={{ marginTop: 4 }}>Arrow keys or WASD to move. Swipe the board on a phone. Enter to finish.</div>
            <div className="row marks-legend" role="group" aria-label="Notes legend">
              <span className="sub">Click a dark tile to cycle a private note:</span>
              <span className="row" style={{ alignItems: "center", gap: 6 }}>
                <Icon name="flagOver" size={20} />
                <span className="sub">suspected pit</span>
              </span>
              <span className="row" style={{ alignItems: "center", gap: 6 }}>
                <Icon name="qOver" size={20} />
                <span className="sub">not sure</span>
              </span>
              {Object.keys(s.marks).length > 0 && (
                <button type="button" className="btn sm alt" onClick={clearMarks}>
                  Clear {Object.keys(s.marks).length} {Object.keys(s.marks).length === 1 ? "note" : "notes"}
                </button>
              )}
            </div>
          </div>
        )}

        {(view === "split" || view === "chain") && (
          <div className="col-r" style={view === "chain" ? { width: "min(100%, 640px)" } : undefined}>
            {view === "split" && <JourneyLog log={s.log} />}
            {!practice && <ChainView runId={s.runId || "0"} you={you} handles={s.confirmed?.handles} txs={s.txs} expanded={view === "chain"} />}
            {practice && view === "split" && (
              <Panel label="Practice">
                <div className="row" style={{ alignItems: "center", gap: 12 }}>
                  <Icon name="lantern" size={36} />
                  <div className="h2">Practice tips</div>
                </div>
                <ul className="tips">
                  <li>Cold means a pit is next to you. Quiet cells are safe to leave behind.</li>
                  <li>Click a dark tile to note a pit. Notes stay on your device.</li>
                  <li>Plan the way back: only relics carried to the gate at A1 count.</li>
                </ul>
                <div className="sub" style={{ marginTop: 8 }}>
                  This run plays on your device, so there is no Chain view. Connect a wallet on the start screen for Sepolia.
                </div>
              </Panel>
            )}
          </div>
        )}
      </main>

      {sheet && !practice && (
        <div className="sheet" role="dialog" aria-label="Chain view">
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn sm alt" autoFocus onClick={() => setSheet(false)}>Close</button>
          </div>
          <ChainView runId={s.runId || "0"} you={you} handles={s.confirmed?.handles} txs={s.txs} expanded />
        </div>
      )}
    </div>
  );
}
