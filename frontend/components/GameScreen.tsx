"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Driver } from "@/lib/driver";
import { MAX_MOVES } from "@/lib/engine";
import { useGame } from "@/lib/useGame";
import { CHAPTERS } from "@/lib/journey";
import { loadSoundPref, setSound, sfx } from "@/lib/sound";
import { cellLabel } from "@/lib/zones";
import { Board } from "./Board";
import { ChainView, JourneyLog, JourneyRibbon, LanternPanel, PackPanel, SignalsPanel } from "./Hud";
import { Icon, Panel, Pennants, Pilgrim, shortAddr } from "./Pixel";
import { HowToPlayButton } from "./HowToPlay";
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
        {!practice && (
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

export function DPad({ onMove, disabled }: { onMove: (d: number) => void; disabled?: boolean }) {
  return (
    <div className="row" style={{ alignItems: "center", gap: 6, flexWrap: "wrap" }} role="group" aria-label="Move">
      {ARROWS.map((a) => (
        <button key={a.dir} type="button" className="btn alt key" aria-label={a.label} disabled={disabled} onClick={() => onMove(a.dir)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sprites/arrow.png" alt="" style={{ transform: `rotate(${a.rot}deg)` }} />
        </button>
      ))}
    </div>
  );
}

export function GameScreen({ driver, address, resume }: { driver: Driver; address?: string; resume?: boolean }) {
  const { state: s, move, finish, toggleMark, dismissError, retry } = useGame(driver, resume);
  const [view, setView] = useState<ViewMode>("split");
  const [confirming, setConfirming] = useState(false);
  const [sound, setSoundState] = useState(false);
  const [card, setCard] = useState<{ ch: number; step: number } | null>(null);
  const prev = useRef({ moves: 0, relics: 0, cold: false, alive: true, phase: "starting" as string });
  const practice = driver.mode === "practice";
  const playing = s.phase === "playing";
  const out = s.moves >= MAX_MOVES;
  const dead = !s.alive;

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
      } else if (e.key === "Escape") setConfirming(false);
    },
    [playing, confirming, move],
  );
  useEffect(() => {
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [key]);

  useEffect(() => setSoundState(loadSoundPref()), []);
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
        <Header runId={s.runId} practice={practice} finalized={!practice} address={address} view={view} onView={setView} sound={sound} onSound={toggleSound} />
        <RevealScreen
          reveal={s.reveal}
          runId={s.runId}
          practice={practice}
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
      <Header runId={s.runId || undefined} practice={practice} address={address} view={view} onView={setView} sound={sound} onSound={toggleSound} />
      <div className="sr-only" aria-live="polite">{s.announce}</div>

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
            <div className="boardwrap">
            {card && (
              <div className="chapter-card" role="status">
                <div className="k">Chapter {card.ch + 1}, step {card.step}</div>
                <div className="n">{CHAPTERS[card.ch].name}</div>
              </div>
            )}
            <Board
              burst={s.pickup}
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
                <div>That step did not go through. Your lantern is unchanged. Try again.</div>
                <div className="sub" style={{ marginTop: 4 }}>{s.error}</div>
                <button type="button" className="btn sm" onClick={dismissError}>Retry</button>
              </div>
            )}
            {dead && playing && (
              <div className="sub" style={{ marginTop: 14 }}>
                You fell. Steps still count and nobody on the chain can tell. Finish to open the map.
              </div>
            )}
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
                <DPad onMove={move} disabled={!playing || out} />
                <div style={{ flex: "1 1 0", minWidth: 12 }} />
                {busyFinish ? (
                  <button type="button" className="btn" disabled>{s.phase === "finishing" ? "Opening the map..." : "Checking the proof..."}</button>
                ) : (
                  <button type="button" className="btn" disabled={!playing} onClick={() => setConfirming(true)}>Finish run</button>
                )}
              </div>
            )}
            <div className="sub" style={{ marginTop: 10 }}>
              Arrow keys or WASD to move. Click a dark tile to mark a suspected pit. Enter to finish.
            </div>
          </div>
        )}

        {(view === "split" || view === "chain") && (
          <div className="col-r" style={view === "chain" ? { width: "min(100%, 640px)" } : undefined}>
            {view === "split" && <JourneyLog log={s.log} />}
            {!practice && <ChainView runId={s.runId || "0"} you={you} handles={s.confirmed?.handles} txs={s.txs} expanded={view === "chain"} />}
            {practice && view === "split" && (
              <Panel label="Practice">
                <div className="h2">Practice</div>
                <div className="sub" style={{ marginTop: 6 }}>
                  This run plays on your device, so there is no Chain view. Connect a wallet on the start screen to play on Sepolia.
                </div>
              </Panel>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
