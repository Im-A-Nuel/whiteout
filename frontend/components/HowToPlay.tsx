"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MiniBoard } from "./MiniBoard";
import { Icon } from "./Pixel";

export type HelpTab = "play" | "chain";

const STEPS: { title: string; body: string }[] = [
  { title: "Start with 24 steps of oil", body: "You begin at the gate on the top left of an 8 by 8 temple. Every step burns one. The storm closes at zero." },
  { title: "Move with the arrow keys", body: "Arrow keys, WASD or the on-screen pad. Walking into a wall wastes the step. On Sepolia each step is one private transaction." },
  { title: "Read the two signals", body: "After each step you see two things only you can read. Cold means a pit is next to you. Glint means a relic is next to you." },
  { title: "Relics and pits", body: "Walk onto a relic to pick it up. Walk onto a pit and you fall. Nobody else can tell, and further steps still count." },
  { title: "Bring relics home", body: "Return to the gate at A1 and press Finish. Your score is the relics you carry, only if you finish alive at the gate. Otherwise it is zero." },
  { title: "The fog lifts", body: "Finishing opens the whole map and your exact path. You can replay the run and check it." },
];

const VIEWS: { mode: "chain" | "you" | "reveal"; icon: string; title: string; label: string; items: string[] }[] = [
  {
    mode: "chain",
    icon: "lock",
    title: "What the chain sees",
    label: "A corner of the board under thick fog with a lock on it",
    items: ["That a run started, and by which wallet", "How many steps were taken", "Opaque handles that change every step. Not where you are, not whether you are alive."],
  },
  {
    mode: "you",
    icon: "glintIcon",
    title: "What only you see",
    label: "The same corner, lit only around the pilgrim, with frost for a nearby pit",
    items: ["Your position and your moves", "Whether you are still alive", "Cold and Glint after each step, decrypted just for you"],
  },
  {
    mode: "reveal",
    icon: "relicIcon",
    title: "What opens at the end",
    label: "The same corner fully revealed with pits, relics and the pilgrim's path",
    items: ["The whole map: every pit and relic", "Your exact path and your score", "A signed proof, so anyone can replay it and check"],
  },
];

export function HowToPlay({ onClose, initial = "play" }: { onClose: () => void; initial?: HelpTab }) {
  const [tab, setTab] = useState<HelpTab>(initial);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // keep focus inside the dialog
        const nodes = document.querySelectorAll<HTMLElement>("[data-howto] button, [data-howto] a");
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="modal-back" onClick={onClose}>
      <div className={`panel modal${tab === "chain" ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="howto-title" data-howto onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 id="howto-title" className="h2" style={{ fontSize: 28 }}>{tab === "play" ? "How to play" : "Why the chain cannot see you die"}</h2>
          <button ref={closeRef} type="button" className="btn sm alt" onClick={onClose}>Close</button>
        </div>

        <div className="row seg" role="tablist" aria-label="Help topics" style={{ marginTop: 12 }}>
          <button type="button" role="tab" id="tab-play" aria-selected={tab === "play"} aria-controls="panel-play" className={`btn sm ${tab === "play" ? "on" : "alt"}`} onClick={() => setTab("play")}>
            How to play
          </button>
          <button type="button" role="tab" id="tab-chain" aria-selected={tab === "chain"} aria-controls="panel-chain" className={`btn sm ${tab === "chain" ? "on" : "alt"}`} onClick={() => setTab("chain")}>
            What the chain sees
          </button>
        </div>

        {tab === "play" ? (
          <div role="tabpanel" id="panel-play" aria-labelledby="tab-play">
            <ol className="steps-list" style={{ marginTop: 16 }}>
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="num">{i + 1}</span>
                  <span>
                    <b style={{ fontWeight: 600 }}>{s.title}</b>
                    <br />
                    <span className="sub">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="row" style={{ gap: 18, flexWrap: "wrap", marginTop: 18 }}>
              <span className="row" style={{ gap: 8, alignItems: "center" }}><Icon name="coldIcon" size={32} />Cold</span>
              <span className="row" style={{ gap: 8, alignItems: "center" }}><Icon name="glintIcon" size={32} />Glint</span>
              <span className="row" style={{ gap: 8, alignItems: "center" }}><Icon name="relicIcon" size={32} />Relic</span>
              <span className="row" style={{ gap: 8, alignItems: "center" }}><Icon name="lantern" size={32} />Oil</span>
            </div>
            <p className="sub" style={{ marginTop: 14 }}>
              Tip: click a dark tile to cycle a private note. Notes stay in this browser and never touch the chain.
            </p>
          </div>
        ) : (
          <div role="tabpanel" id="panel-chain" aria-labelledby="tab-chain">
            <p className="sub" style={{ marginTop: 14, maxWidth: "62ch" }}>
              The same corner of the temple, seen three ways. The pits and relics here are an illustration, not a real run.
            </p>
            <div className="views">
              {VIEWS.map((v) => (
                <div key={v.mode} className="view-card">
                  <MiniBoard mode={v.mode} label={v.label} />
                  <div className="row" style={{ gap: 8, alignItems: "center", marginTop: 16 }}>
                    <Icon name={v.icon} size={24} />
                    <b className="view-h">{v.title}</b>
                  </div>
                  <ul>
                    {v.items.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="sub" style={{ marginTop: 16 }}>
              If the state were public, the next player would copy every pit and there would be no game.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function HowToPlayButton({ className = "btn sm alt", label = "How to play", tab = "play" }: { className?: string; label?: string; tab?: HelpTab }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setTimeout(() => opener.current?.focus(), 0);
  };
  return (
    <>
      <button ref={opener} type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <HowToPlay onClose={close} initial={tab} />}
    </>
  );
}

const SEEN = "whiteout:seen-help";

/** Shown once to a new visitor, then remembered. */
export function FirstVisitHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(SEEN) !== "1");
    } catch {
      setShow(false);
    }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(SEEN, "1");
    } catch {
      /* storage can be unavailable */
    }
    setShow(false);
  };
  return (
    <div className="notice" role="region" aria-label="New here">
      <span>New here? The rules take one minute to read.</span>
      <HowToPlayButton className="btn sm" />
      <button type="button" className="btn sm alt" onClick={dismiss}>Got it</button>
    </div>
  );
}
