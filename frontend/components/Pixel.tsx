import type { CSSProperties, ReactNode } from "react";

export function Icon({ name, size, alt = "", style }: { name: string; size: number; alt?: string; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="icon" src={`/sprites/${name}.png`} width={size} height={size} alt={alt} style={{ width: size, height: size, ...style }} />
  );
}

export function Panel({
  children,
  label,
  stone,
  good,
  style,
}: {
  children: ReactNode;
  label?: string;
  stone?: boolean;
  good?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section className={`panel${stone ? " stone" : ""}${good ? " good" : ""}`} aria-label={label} style={style}>
      {children}
    </section>
  );
}

/** The pilgrim sprite. `size` is the art scale in px per art pixel. */
export function Pilgrim({
  variant = "down",
  flip,
  bob,
  still,
  scale,
  style,
  className = "",
}: {
  variant?: "down" | "side" | "up";
  flip?: boolean;
  bob?: boolean;
  still?: boolean;
  scale?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const s: CSSProperties = { ...(scale ? ({ ["--s" as string]: `${scale}px` } as CSSProperties) : {}), ...style };
  return (
    <div className={`pil ${variant}${flip ? " flip" : ""}${bob ? " bob" : ""}${still ? " still" : ""} ${className}`} style={s} role="img" aria-label="Pilgrim">
      <div className="spr" />
    </div>
  );
}

export function PipRow({ total, on, label, white, cols = 12, gap = 6 }: { total: number; on: number; label: string; white?: boolean; cols?: number; gap?: number }) {
  return (
    <div role="img" aria-label={label} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 12px)`, gap, marginTop: 14 }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`pip ${white ? (i < on ? "white" : "off") : i >= total - on ? "on" : "off"}`} />
      ))}
    </div>
  );
}

const FLAGS = ["#4C7BD9", "#EAF1F7", "#D6423A", "#4FBF9F", "#F2C14E"];
export function Pennants() {
  return (
    <div className="pennants" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="pn" style={{ background: FLAGS[i % 5], animationDelay: `${(i % 4) * 0.4}s` }} />
      ))}
    </div>
  );
}

export const shortHash = (h?: string): string => (h && h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h ?? "");
export const shortAddr = (a?: string): string => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
