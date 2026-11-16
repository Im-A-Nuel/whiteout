import type { ReactNode } from "react";
import { Header } from "./GameScreen";
import { Scene } from "./Scene";

/** Frame for the quiet screens: header, snow, and the mountain scene dimmed behind the panel. */
export function PageShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="root">
      <Scene walker={false} dim />
      <div className="snow snowA" />
      <Header />
      <main className={`shell-main${wide ? " wide" : ""}`}>{children}</main>
    </div>
  );
}
