import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import type { WhiteoutHarness } from "../types";
import type { RefState } from "./reference";

export async function deployHarness(): Promise<{ game: WhiteoutHarness; address: string }> {
  const factory = await ethers.getContractFactory("WhiteoutHarness");
  const game = (await factory.deploy()) as unknown as WhiteoutHarness;
  await game.waitForDeployment();
  return { game, address: await game.getAddress() };
}

export async function deployReal() {
  const factory = await ethers.getContractFactory("Whiteout");
  const game = await factory.deploy();
  await game.waitForDeployment();
  return { game, address: await game.getAddress() };
}

/** Starts a run on a fixed map and returns its id. */
export async function startFixed(game: WhiteoutHarness, player: HardhatEthersSigner, hazards: bigint, prizes: bigint) {
  await (await game.setNextMap(hazards, prizes)).wait();
  await (await game.connect(player).startRun()).wait();
  return await game.activeRunOf(player.address);
}

export async function sendMove(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: { getAddress(): Promise<string>; connect(s: HardhatEthersSigner): any },
  player: HardhatEthersSigner,
  dir: number,
) {
  const address = await game.getAddress();
  const enc = await fhevm.createEncryptedInput(address, player.address).add8(dir).encrypt();
  const tx = await game.connect(player).move(enc.handles[0], enc.inputProof);
  return await tx.wait();
}

/** Reads the real encrypted state through the mock debugger (bypasses the ACL, test oracle only). */
export async function readState(game: WhiteoutHarness, runId: bigint) {
  const h = await game.getHandles(runId);
  const u64 = (x: string) => fhevm.debugger.decryptEuint(FhevmType.euint64, x);
  const u8 = (x: string) => fhevm.debugger.decryptEuint(FhevmType.euint8, x);
  // Sequential on purpose: the mock coprocessor event cursor is not safe for concurrent reads.
  const run = await game.getRun(runId);
  const pos = await u64(h.pos);
  const alive = await fhevm.debugger.decryptEbool(h.alive);
  const collected = await u8(h.collected);
  const dangerNear = await fhevm.debugger.decryptEbool(h.dangerNear);
  const prizeNear = await fhevm.debugger.decryptEbool(h.prizeNear);
  const hazards = await u64(h.hazards);
  const prizesInitial = await u64(h.prizesInitial);
  const path = await u64(h.path);
  return {
    moves: Number(run.moves),
    pos,
    alive,
    collected: Number(collected),
    dangerNear,
    prizeNear,
    hazards,
    prizesInitial,
    path,
  };
}

const show = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

export function expectSameState(actual: Awaited<ReturnType<typeof readState>>, ref: RefState, ctx: string) {
  const pick = (s: {
    moves: number;
    pos: bigint;
    alive: boolean;
    collected: number;
    dangerNear: boolean;
    prizeNear: boolean;
    path: bigint;
  }) => ({
    moves: s.moves,
    pos: s.pos,
    alive: s.alive,
    collected: s.collected,
    dangerNear: s.dangerNear,
    prizeNear: s.prizeNear,
    path: s.path,
  });
  const sa = show(pick(actual));
  const sb = show(pick(ref));
  if (sa !== sb) throw new Error(`state mismatch ${ctx}\n contract ${sa}\n reference ${sb}`);
}
