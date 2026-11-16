import { Icon } from "./Pixel";

/** A 16 x 16 sprite at an integer scale. Never scaled by a fraction, so the pixels stay square. */
export function BigSprite({ name, scale = 8, className = "" }: { name: string; scale?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`icon ${className}`} src={`/sprites/${name}.png`} width={16 * scale} height={16 * scale} alt="" style={{ width: 16 * scale, height: 16 * scale }} />
  );
}

export interface PodiumEntry {
  rank: 1 | 2 | 3;
  label: string;
  score: number;
}

const HEIGHT: Record<number, number> = { 1: 124, 2: 92, 3: 64 };

/**
 * Three pixel steps, gold in the middle. With no entries it shows locks, so an empty leaderboard still
 * has something to look at. Decorative: the table next to it carries the data.
 */
export function Podium({ entries }: { entries: PodiumEntry[] }) {
  return (
    <div className="podium" aria-hidden="true">
      {[2, 1, 3].map((rank) => {
        const e = entries.find((x) => x.rank === rank);
        return (
          <div key={rank} className={`pod pod-${rank}`}>
            <div className="pod-top">
              {e ? (
                <>
                  <Icon name="relicIcon" size={rank === 1 ? 48 : 36} />
                  <span className="pod-score">{e.score}</span>
                </>
              ) : (
                <Icon name="lock" size={24} />
              )}
            </div>
            <div className="pod-block" style={{ height: HEIGHT[rank] }}>{rank}</div>
            <div className="pod-label hash">{e ? e.label : "empty"}</div>
          </div>
        );
      })}
    </div>
  );
}

/** The 404 picture: a cairn in a snow drift where the path ended. */
export function StormScene() {
  return (
    <div className="storm" aria-hidden="true">
      <div className="tuft tuft-l" />
      <BigSprite name="cairn" scale={8} />
      <div className="tuft tuft-r" />
    </div>
  );
}

/** The error picture: a lantern that flickers. */
export function FlickerLantern() {
  return (
    <div className="flicker" aria-hidden="true">
      <Icon name="lantern" size={96} />
    </div>
  );
}
