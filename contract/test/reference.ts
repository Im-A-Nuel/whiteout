/**
 * Plaintext reference model of the Whiteout rules. It is the oracle for the differential tests:
 * the encrypted contract must agree with it on every step. Same bitboard layout as the contract,
 * bit `i` is cell `row * 8 + col`.
 */
const MASK64 = (1n << 64n) - 1n;
export const CABIN = 1n;
export const SAFE_ZONE = 0x103n;
export const NOT_FILE_A = 0xfefefefefefefefen;
export const NOT_FILE_H = 0x7f7f7f7f7f7f7f7fn;
export const MAX_MOVES = 24;

export enum Dir {
  North = 0,
  South = 1,
  West = 2,
  East = 3,
}

export interface RefState {
  hazards: bigint;
  prizesInitial: bigint;
  prizes: bigint;
  pos: bigint;
  path: bigint;
  collected: number;
  alive: boolean;
  dangerNear: boolean;
  prizeNear: boolean;
  moves: number;
}

const shl = (x: bigint, n: bigint) => (x << n) & MASK64;
const shr = (x: bigint, n: bigint) => x >> n;

export function neighbors(p: bigint): bigint {
  return shr(p, 8n) | shl(p, 8n) | (shr(p, 1n) & NOT_FILE_H) | (shl(p, 1n) & NOT_FILE_A);
}

export function start(hazards: bigint, prizes: bigint): RefState {
  const nb = neighbors(CABIN);
  return {
    hazards,
    prizesInitial: prizes,
    prizes,
    pos: CABIN,
    path: 0n,
    collected: 0,
    alive: true,
    dangerNear: (nb & hazards) !== 0n,
    prizeNear: (nb & prizes) !== 0n,
    moves: 0,
  };
}

export function step(s: RefState, rawDir: number): RefState {
  if (s.moves >= MAX_MOVES) throw new Error("out of steps");
  const dir = rawDir & 3;
  const p = s.pos;
  let cand: bigint;
  if (dir === Dir.North) cand = shr(p, 8n);
  else if (dir === Dir.South) cand = shl(p, 8n);
  else if (dir === Dir.West) cand = shr(p, 1n) & NOT_FILE_H;
  else cand = shl(p, 1n) & NOT_FILE_A;

  const moved = cand !== 0n ? cand : p;
  const newPos = s.alive ? moved : p;
  const hit = (newPos & s.hazards) !== 0n;
  const alive = s.alive && !hit;
  const gotPrize = alive && (newPos & s.prizes) !== 0n;
  const prizes = s.prizes & ~newPos & MASK64;
  const nb = neighbors(newPos);

  return {
    ...s,
    pos: newPos,
    alive,
    prizes,
    collected: (s.collected + (gotPrize ? 1 : 0)) & 0xff,
    path: shl(s.path, 2n) | BigInt(dir),
    dangerNear: (nb & s.hazards) !== 0n,
    prizeNear: (nb & prizes) !== 0n,
    moves: s.moves + 1,
  };
}

export function score(s: RefState): number {
  return s.alive && s.pos === CABIN ? s.collected : 0;
}

/** Decode a packed path word into the direction list, oldest first. */
export function decodePath(path: bigint, moves: number): number[] {
  const out: number[] = [];
  for (let i = moves - 1; i >= 0; i--) out.push(Number((path >> BigInt(2 * i)) & 3n));
  return out;
}

export const cell = (row: number, col: number): bigint => 1n << BigInt(row * 8 + col);
