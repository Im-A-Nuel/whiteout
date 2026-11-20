"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Board, type BoardProps } from "./Board";

const KEY = "whiteout:board3d";
const EVENT = "whiteout:board3d-change";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/** The 2D or 3D choice, remembered in this browser and shared by every component that asks. */
export function useBoard3D(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => false,
  );
  const set = (v: boolean) => {
    try {
      localStorage.setItem(KEY, v ? "on" : "off");
    } catch {
      /* storage can be unavailable, the choice then lasts until reload only */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, set];
}

/** True when the browser can create a WebGL context. Read after mount, the server cannot know. */
export function useWebGL(): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setOk(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

const Board3D = dynamic(() => import("./Board3D"), {
  ssr: false,
  loading: () => (
    <div className="b3d b3d-loading" role="status">
      <span className="pulse">Loading the 3D temple...</span>
    </div>
  ),
});

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Draws the board in 2D or 3D. 3D falls back to 2D when WebGL is missing or the scene fails. */
export function BoardView(props: BoardProps) {
  const [on] = useBoard3D();
  const webgl = useWebGL();
  if (!on || !webgl) return <Board {...props} />;
  return (
    <Boundary fallback={<Board {...props} />}>
      <Board3D {...props} />
    </Boundary>
  );
}
