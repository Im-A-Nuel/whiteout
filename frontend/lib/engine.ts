/**
 * Plaintext Whiteout engine on 64-bit bitboards. Same rules as the contract
 * (see contract/test/reference.ts, which is the tested oracle). Used for practice runs
 * and to replay a revealed run in the browser.
 */
export const MAX_MOVES = 24;
const MASK64 = (1n << 64n) - 1n;
const NOT_FILE_A = 0xfefefefefefefefen;
const NOT_FILE_H = 0x7f7f7f7f7f7f7f7fn;
const SAFE_ZONE = 0x103n;

export const Dir = { North: 0, South: 1, West: 2, East: 3 } as const;

export interface EngineState {
  hazards: bigint;
  prizesInitial: bigint;
  prizes: bigint;
  pos: bigint;
  collected: number;
  alive: boolean;
  cold: boolean;
  glint: boolean;
  dirs: number[];
}

const shl = (x: bigint, n: bigint) => (x << n) & MASK64;
const shr = (x: bigint, n: bigint) => x >> n;

export function neighbors(p: bigint): bigint {
  return shr(p, 8n) | shl(p, 8n) | (shr(p, 1n) & NOT_FILE_H) | (shl(p, 1n) & NOT_FILE_A);
}

export const bitOf = (cell: number): bigint => 1n << BigInt(cell);

export function cellOfBit(bits: bigint): number {
  if (bits === 0n) return -1;
  return bits.toString(2).length - 1;
}

export function cellsOf(bits: bigint): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) if ((bits >> BigInt(i)) & 1n) out.push(i);
  return out;
}

export function start(hazards: bigint, prizes: bigint): EngineState {
  const nb = neighbors(1n);
  return {
    hazards,
    prizesInitial: prizes,
    prizes,
    pos: 1n,
    collected: 0,
    alive: true,
    cold: (nb & hazards) !== 0n,
    glint: (nb & prizes) !== 0n,
    dirs: [],
  };
}

export function step(s: EngineState, rawDir: number): EngineState {
  if (s.dirs.length >= MAX_MOVES) throw new Error("out of steps");
  const dir = rawDir & 3;
  const p = s.pos;
  const cand =
    dir === Dir.North ? shr(p, 8n) : dir === Dir.South ? shl(p, 8n) : dir === Dir.West ? shr(p, 1n) & NOT_FILE_H : shl(p, 1n) & NOT_FILE_A;
  const moved = cand !== 0n ? cand : p;
  const newPos = s.alive ? moved : p;
  const alive = s.alive && (newPos & s.hazards) === 0n;
  const got = alive && (newPos & s.prizes) !== 0n;
  const prizes = s.prizes & ~newPos & MASK64;
  const nb = neighbors(newPos);
  return {
    ...s,
    pos: newPos,
    alive,
    prizes,
    collected: s.collected + (got ? 1 : 0),
    cold: (nb & s.hazards) !== 0n,
    glint: (nb & prizes) !== 0n,
    dirs: [...s.dirs, dir],
  };
}

export const score = (s: EngineState): number => (s.alive && s.pos === 1n ? s.collected : 0);

/** Each bit is 1 with probability 1/8 (AND of three random words), safe zone and overlaps removed. */
export function randomMap(rand: () => bigint = randWord): { hazards: bigint; prizes: bigint } {
  let h = rand() & rand() & rand();
  let p = rand() & rand() & rand();
  h &= ~SAFE_ZONE & MASK64;
  p &= ~h & ~1n & MASK64;
  return { hazards: h, prizes: p };
}

function randWord(): bigint {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return (BigInt(a[0]) << 32n) | BigInt(a[1]);
}

/** Replays a direction list from a revealed map. Returns one state per step, state 0 is the start. */
export function replay(hazards: bigint, prizes: bigint, dirs: number[]): EngineState[] {
  const states = [start(hazards, prizes)];
  for (const d of dirs) states.push(step(states[states.length - 1], d));
  return states;
}

/** Decodes the packed on-chain path word (2 bits per step, oldest in the highest bits). */
export function decodePath(path: bigint, moves: number): number[] {
  const out: number[] = [];
  for (let i = moves - 1; i >= 0; i--) out.push(Number((path >> BigInt(2 * i)) & 3n));
  return out;
}
