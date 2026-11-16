"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Pixel";

const STEPS: { title: string; body: string }[] = [
  { title: "Start with 24 steps of oil", body: "You begin at the gate on the top left of an 8 by 8 temple. Every step burns one. The storm closes at zero." },
  { title: "Move with the arrow keys", body: "Arrow keys, WASD or the on-screen pad. Walking into a wall wastes the step. On Sepolia each step is one private transaction." },
  { title: "Read the two signals", body: "After each step you see two things only you can read. Cold means a pit is next to you. Glint means a relic is next to you." },
  { title: "Relics and pits", body: "Walk onto a relic to pick it up. Walk onto a pit and you fall. Nobody else can tell, and further steps still count." },
  { title: "Bring relics home", body: "Return to the gate at A1 and press Finish. Your score is the relics you carry, only if you finish alive at the gate. Otherwise it is zero." },
  { title: "The fog lifts", body: "Finishing opens the whole map and your exact path. You can replay the run and check it." },
];

export function HowToPlay({ onClose }: { onClose: () => void }) {
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
      <div className="panel modal" role="dialog" aria-modal="true" aria-labelledby="howto-title" data-howto onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 id="howto-title" className="h2" style={{ fontSize: 28 }}>How to play</h2>
          <button ref={closeRef} type="button" className="btn sm alt" onClick={onClose}>Close</button>
        </div>
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
          Tip: click a dark tile to mark a suspected pit. Marks stay in this browser and never touch the chain.
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function HowToPlayButton({ className = "btn sm alt" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setTimeout(() => opener.current?.focus(), 0);
  };
  return (
    <>
      <button ref={opener} type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        How to play
      </button>
      {open && <HowToPlay onClose={close} />}
    </>
  );
}
