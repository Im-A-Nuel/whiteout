/**
 * Start screen night scene: five hard sky bands (CSS), three mountain ridges drawn as 1 art pixel columns,
 * a stepped-roof pagoda on the far ridge, 46 stars. Pure decoration, a function of nothing but constants.
 */
const W = 360;
const H = 195;

function ridge(base: number, amp: number, f1: number, f2: number, phase: number): number[] {
  return Array.from({ length: W }, (_, x) => {
    const y = base - amp * (0.6 * Math.sin(x * f1 + phase) + 0.4 * Math.sin(x * f2 + phase * 2.3));
    return Math.round(y);
  });
}

function ridgePath(ys: number[]): string {
  let d = `M0 ${H} V${ys[0]}`;
  for (let x = 1; x < W; x++) if (ys[x] !== ys[x - 1]) d += ` H${x} V${ys[x]}`;
  return d + ` H${W} V${H} Z`;
}

const FAR = ridge(118, 22, 0.021, 0.063, 1.2);
const MID = ridge(142, 18, 0.027, 0.081, 3.1);
const NEAR = ridge(168, 12, 0.034, 0.1, 0.4);
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 97 + 31) % W,
  y: (i * 53 + 7) % 90,
  big: i % 7 === 0,
}));
const PX = 250;
const PY = FAR[PX];

export function Scene() {
  return (
    <>
      <div className="sky" />
      <svg className="ridge" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true" style={{ height: "100%", imageRendering: "pixelated" }}>
        {STARS.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width={s.big ? 2 : 1} height={s.big ? 2 : 1} fill={s.big ? "#EAF1F7" : "#A9B6D6"} />
        ))}
        <path d={ridgePath(FAR)} fill="#20265A" />
        <path d={FAR.reduce((d, y, x) => (y > 0 && y < 112 && x % 1 === 0 ? d + `M${x} ${y}h1v2h-1z` : d), "")} fill="#3A4280" />
        {/* pagoda: plinth, three stepped roofs, windows, finial */}
        <rect x={PX - 8} y={PY - 4} width={16} height={Math.max(4, 8)} fill="#171B45" />
        <rect x={PX - 6} y={PY - 14} width={12} height={10} fill="#272E6C" />
        <rect x={PX - 2} y={PY - 12} width={4} height={4} fill="#FFB547" />
        <rect x={PX - 9} y={PY - 17} width={18} height={3} fill="#7A2E3E" />
        <rect x={PX - 9} y={PY - 18} width={18} height={1} fill="#EAF1F7" />
        <rect x={PX - 4} y={PY - 25} width={8} height={8} fill="#272E6C" />
        <rect x={PX - 1} y={PY - 23} width={2} height={3} fill="#FFB547" />
        <rect x={PX - 7} y={PY - 28} width={14} height={3} fill="#7A2E3E" />
        <rect x={PX - 7} y={PY - 29} width={14} height={1} fill="#EAF1F7" />
        <rect x={PX - 2} y={PY - 34} width={4} height={5} fill="#272E6C" />
        <rect x={PX - 5} y={PY - 37} width={10} height={3} fill="#7A2E3E" />
        <rect x={PX - 5} y={PY - 38} width={10} height={1} fill="#EAF1F7" />
        <rect x={PX} y={PY - 43} width={1} height={5} fill="#F2C14E" />
        <path d={ridgePath(MID)} fill="#171B45" />
        <path d={ridgePath(NEAR)} fill="#0E1030" />
      </svg>
    </>
  );
}
