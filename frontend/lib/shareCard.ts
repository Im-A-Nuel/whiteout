import { endingLabel, type Analysis } from "./reveal";
import { cellLabel, col, decor, pitKey, row, tileKey } from "./zones";

const W = 1200;
const H = 630;
const T = 64; // tile size on the card, 4x the 16 px art
const BX = 628;
const BY = 59;

const cache = new Map<string, Promise<HTMLImageElement>>();
function sprite(name: string): Promise<HTMLImageElement> {
  if (!cache.has(name)) {
    cache.set(
      name,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`sprite ${name} failed to load`));
        img.src = `/sprites/${name}.png`;
      }),
    );
  }
  return cache.get(name)!;
}

export interface CardInfo {
  score: number;
  steps: number;
  runId: string;
  practice: boolean;
}

/** Draws a 1200 x 630 share image of a finished run. Everything on it is already public after finish. */
export async function renderCard(a: Analysis, info: CardInfo): Promise<Blob> {
  await document.fonts.ready;
  const family = getComputedStyle(document.body).getPropertyValue("--font-pixel").trim() || "monospace";
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // three hard sky bands
  ctx.fillStyle = "#0E1029";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#12153A";
  ctx.fillRect(0, H * 0.3, W, H * 0.32);
  ctx.fillStyle = "#171B45";
  ctx.fillRect(0, H * 0.62, W, H);

  // board
  ctx.fillStyle = "#3A4180";
  ctx.fillRect(BX - 8, BY - 8, T * 8 + 16, T * 8 + 16);
  ctx.fillStyle = "#14102A";
  ctx.fillRect(BX - 4, BY - 4, T * 8 + 8, T * 8 + 8);
  const pits = new Set(a.pits);
  const taken = new Set(a.takenAt.map((t) => t.cell));
  const missed = new Set(a.prizes.filter((c) => !taken.has(c)));

  for (let c = 0; c < 64; c++) {
    const x = BX + col(c) * T;
    const y = BY + row(c) * T;
    const base = c === 0 ? "gate" : pits.has(c) ? pitKey(c) : tileKey(c);
    ctx.drawImage(await sprite(base), x, y, T, T);
    const d = decor(c);
    if (d && !pits.has(c) && !missed.has(c)) ctx.drawImage(await sprite(d), x, y, T, T);
    if (missed.has(c)) ctx.drawImage(await sprite("relicOver"), x, y, T, T);
    if (taken.has(c)) ctx.drawImage(await sprite("relicIcon"), x + T - 52, y + T - 52, 48, 48);
  }

  // path dots, 2 art px squares every 8 art px
  const dot = (cx: number, cy: number) => {
    ctx.fillStyle = "#14102A";
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.fillStyle = "#FF9B4A";
    ctx.fillRect(cx - 4, cy - 4, 8, 8);
  };
  for (let i = 1; i < a.cells.length; i++) {
    const p = a.cells[i - 1];
    const q = a.cells[i];
    if (p === q) continue;
    const ax = BX + col(p) * T + T / 2;
    const ay = BY + row(p) * T + T / 2;
    const bx = BX + col(q) * T + T / 2;
    const by = BY + row(q) * T + T / 2;
    const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k < len; k += 32) dot(ax + ((bx - ax) * k) / len, ay + ((by - ay) * k) / len);
  }

  // pilgrim at the end, or a cairn if the run ended on a pit
  const fx = BX + col(a.finalCell) * T;
  const fy = BY + row(a.finalCell) * T;
  if (a.ending === "lost") ctx.drawImage(await sprite("cairn"), fx, fy, T, T);
  else ctx.drawImage(await sprite("pilDownSheet"), 0, 0, 16, 16, fx, fy, T, T);

  // text column
  ctx.textBaseline = "alphabetic";
  const text = (s: string, x: number, y: number, size: number, color: string, weight = 600, shadow?: string) => {
    ctx.font = `${weight} ${size}px ${family}`;
    if (shadow) {
      ctx.fillStyle = shadow;
      ctx.fillText(s, x + Math.round(size / 12), y + Math.round(size / 12));
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  };
  text("Whiteout", 48, 120, 84, "#EAF1F7", 700, "#D6423A");
  text("The chain can’t see you die.", 48, 168, 28, "#A9B6D6");
  text(String(info.score).padStart(2, "0"), 48, 340, 168, "#EAF1F7", 700, "#D6423A");
  const unit = a.ending === "home" ? (info.score === 1 ? "relic carried home" : "relics carried home") : "final score";
  text(unit, 300, 322, 26, "#A9B6D6");

  const label = endingLabel(a);
  ctx.font = `700 30px ${family}`;
  const lw = ctx.measureText(label).width + 36;
  ctx.fillStyle = "#14102A";
  ctx.fillRect(48 - 4, 382 - 4, lw + 8, 56 + 8);
  ctx.fillStyle = a.ending === "home" ? "#D6423A" : "#2F3670";
  ctx.fillRect(48, 382, lw, 56);
  ctx.fillStyle = a.ending === "home" ? "#8E2430" : "#1B1F42";
  ctx.fillRect(48, 382 + 48, lw, 8);
  text(label, 66, 422, 30, "#FFFFFF", 700);

  const missedText = missed.size === 0 ? "Nothing missed" : missed.size <= 4 ? `Missed ${[...missed].map(cellLabel).join(", ")}` : `${missed.size} relics missed`;
  text(`${info.steps} of 24 steps · ${missedText}`, 48, 488, 22, "#C7D3EE", 500);
  text(info.practice ? "Practice run, nothing was encrypted" : `Run No. ${info.runId.padStart(4, "0")} on Sepolia, built on Zama FHEVM`, 48, 560, 20, "#A9B6D6", 500);
  if (!info.practice) text("Map, path and score stayed encrypted until the run ended.", 48, 590, 20, "#A9B6D6", 400);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("could not encode the card"))), "image/png"));
}
