"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA, pixelScale } from "@/lib/world3d";
import type { BoardProps } from "./Board";
import { Scene, type RigApi } from "./board3d/Scene";

/** The 3D temple. Same props as the 2D board, so the game logic and the privacy rules do not change. */
export default function Board3D(p: BoardProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const api = useRef<RigApi>({ rotate: () => undefined, reset: () => undefined, tilt: () => undefined });
  const [width, setWidth] = useState(576);
  const [azimuth, setAzimuth] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [family, setFamily] = useState("monospace");

  useEffect(() => {
    setFamily(getComputedStyle(document.body).getPropertyValue("--font-pixel").trim() || "monospace");
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const f = () => setReduced(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 576));
    ro.observe(el);
    setWidth(el.clientWidth || 576);
    return () => ro.disconnect();
  }, []);

  // Q and E turn the camera a quarter step. Movement keys stay with the game and keep their compass meaning.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "q" || e.key === "Q") api.current.rotate(-Math.PI / 4);
      if (e.key === "e" || e.key === "E") api.current.rotate(Math.PI / 4);
      if (e.key === "t" || e.key === "T") api.current.tilt();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const scale = pixelScale(width);
  const onAzimuth = useCallback((a: number) => setAzimuth(a), []);

  return (
    <div className="b3d" ref={wrap}>
      <Canvas
        className="b3d-canvas"
        dpr={1 / scale}
        flat
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: CAMERA.fov, near: 0.1, far: 220, position: [0, CAMERA.distance * Math.cos(CAMERA.polar), CAMERA.distance * Math.sin(CAMERA.polar)] }}
        aria-label="3D view of the temple. Use the move buttons or the arrow keys to walk. Drag to turn the camera."
        role="img"
      >
        <Scene
          trail={p.trail}
          pos={p.pos}
          dir={p.dir}
          cold={p.cold}
          glint={p.glint}
          marks={p.marks ?? {}}
          taken={p.taken ?? []}
          onCell={p.onCell}
          reveal={p.reveal}
          burst={p.burst}
          fallen={p.fallen}
          reduced={reduced}
          fontFamily={family}
          api={api}
          onAzimuth={onAzimuth}
        />
      </Canvas>

      {p.cold && !p.reveal && <div className="frost" aria-hidden="true" />}

      <div className="b3d-hud">
        <div className="compass" aria-hidden="true" title="North">
          <span className="compass-n" style={{ transform: `rotate(${azimuth}rad)` }}>N</span>
        </div>
        <button type="button" className="btn sm alt key3d" aria-label="Turn the camera left (Q)" onClick={() => api.current.rotate(-Math.PI / 4)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sprites/arrow.png" alt="" style={{ transform: "rotate(270deg)" }} />
        </button>
        <button type="button" className="btn sm alt key3d" aria-label="Turn the camera right (E)" onClick={() => api.current.rotate(Math.PI / 4)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sprites/arrow.png" alt="" style={{ transform: "rotate(90deg)" }} />
        </button>
        <button type="button" className="btn sm alt" aria-label="Step through the camera angles: default, overview, horizon (T)" onClick={() => api.current.tilt()}>Tilt</button>
        <button type="button" className="btn sm alt" onClick={() => api.current.reset()}>Reset view</button>
      </div>
      <div className="b3d-tip" aria-hidden="true">Drag to turn, scroll to zoom, Q E turn, T tilts</div>
    </div>
  );
}
