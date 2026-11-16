import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { WhiteoutHarness } from "../types";
import { deployHarness, expectSameState, readState, sendMove, startFixed } from "./helpers";
import { cell, decodePath, Dir, MAX_MOVES, score, start, step } from "./reference";

const E = Dir.East;
const S = Dir.South;
const N = Dir.North;
const W = Dir.West;

describe("Whiteout engine", function () {
  let game: WhiteoutHarness;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();
    [, alice, bob] = await ethers.getSigners();
    ({ game } = await deployHarness());
  });

  const scoreOf = async (id: bigint) => {
    const h = await game.getHandles(id);
    return Number(await fhevm.debugger.decryptEuint(FhevmType.euint8, h.score));
  };

  it("1 starts on the cabin, alive, empty pack", async function () {
    const id = await startFixed(game, alice, cell(3, 3), cell(5, 5));
    const s = await readState(game, id);
    expect(s.pos).to.eq(1n);
    expect(s.alive).to.eq(true);
    expect(s.collected).to.eq(0);
    expect(s.moves).to.eq(0);
    expect(s.hazards).to.eq(cell(3, 3));
    expect(s.prizesInitial).to.eq(cell(5, 5));
  });

  it("2 moves east into an empty cell", async function () {
    const id = await startFixed(game, alice, cell(3, 3), 0n);
    await sendMove(game, alice, E);
    const s = await readState(game, id);
    expect(s.pos).to.eq(cell(0, 1));
    expect(s.alive).to.eq(true);
  });

  it("3 to 6 bumps keep position and spend the step, no wraparound", async function () {
    const id = await startFixed(game, alice, 0n, 0n);
    await sendMove(game, alice, N);
    await sendMove(game, alice, W);
    let s = await readState(game, id);
    expect(s.pos).to.eq(1n);
    expect(s.moves).to.eq(2);
    for (let i = 0; i < 7; i++) await sendMove(game, alice, S);
    s = await readState(game, id);
    expect(s.pos).to.eq(cell(7, 0));
    await sendMove(game, alice, S);
    s = await readState(game, id);
    expect(s.pos).to.eq(cell(7, 0));
    await sendMove(game, alice, W);
    s = await readState(game, id);
    expect(s.pos).to.eq(cell(7, 0));
    for (let i = 0; i < 7; i++) await sendMove(game, alice, E);
    s = await readState(game, id);
    expect(s.pos).to.eq(cell(7, 7));
    await sendMove(game, alice, E);
    s = await readState(game, id);
    expect(s.pos).to.eq(cell(7, 7));
  });

  it("7 and 8 pit kills, the dead do not move or collect", async function () {
    const id = await startFixed(game, alice, cell(0, 2), cell(0, 3));
    await sendMove(game, alice, E);
    await sendMove(game, alice, E);
    let s = await readState(game, id);
    expect(s.alive).to.eq(false);
    const deathPos = s.pos;
    await sendMove(game, alice, E);
    await sendMove(game, alice, E);
    s = await readState(game, id);
    expect(s.pos).to.eq(deathPos);
    expect(s.collected).to.eq(0);
    expect(s.moves).to.eq(4);
  });

  it("9 and 10 treasure is collected once", async function () {
    const id = await startFixed(game, alice, 0n, cell(0, 2));
    await sendMove(game, alice, E);
    await sendMove(game, alice, E);
    let s = await readState(game, id);
    expect(s.collected).to.eq(1);
    await sendMove(game, alice, W);
    await sendMove(game, alice, E);
    s = await readState(game, id);
    expect(s.collected).to.eq(1);
  });

  it("11 Cold is orthogonal only", async function () {
    const id = await startFixed(game, alice, cell(1, 1), 0n);
    let s = await readState(game, id);
    expect(s.dangerNear).to.eq(false);
    await sendMove(game, alice, E);
    s = await readState(game, id);
    expect(s.dangerNear).to.eq(true);
    await sendMove(game, alice, E);
    s = await readState(game, id);
    expect(s.dangerNear).to.eq(false);
  });

  it("12 Glint is orthogonal only", async function () {
    const id = await startFixed(game, alice, 0n, cell(1, 1));
    await sendMove(game, alice, E);
    let s = await readState(game, id);
    expect(s.prizeNear).to.eq(true);
    await sendMove(game, alice, E);
    s = await readState(game, id);
    expect(s.prizeNear).to.eq(false);
  });

  it("13 direction above 3 behaves as dir & 3", async function () {
    const id = await startFixed(game, alice, 0n, 0n);
    await sendMove(game, alice, 4 + E);
    const s = await readState(game, id);
    expect(s.pos).to.eq(cell(0, 1));
  });

  describe("finish", function () {
    it("14 at cabin alive, score equals collected", async function () {
      const id = await startFixed(game, alice, 0n, cell(0, 1));
      await sendMove(game, alice, E);
      await sendMove(game, alice, W);
      await (await game.connect(alice).finish(id)).wait();
      expect(await scoreOf(id)).to.eq(1);
    });

    it("15 away from cabin scores 0", async function () {
      const id = await startFixed(game, alice, 0n, cell(0, 1));
      await sendMove(game, alice, E);
      await (await game.connect(alice).finish(id)).wait();
      expect(await scoreOf(id)).to.eq(0);
    });

    it("16 dead at cabin scores 0", async function () {
      const id = await startFixed(game, alice, cell(0, 2), cell(0, 1));
      await sendMove(game, alice, E); // treasure
      await sendMove(game, alice, E); // pit
      await sendMove(game, alice, W); // dead, stays
      const s = await readState(game, id);
      expect(s.alive).to.eq(false);
      await (await game.connect(alice).finish(id)).wait();
      expect(await scoreOf(id)).to.eq(0);
    });

    it("17 reverts after the step limit and anyone can finish", async function () {
      const id = await startFixed(game, alice, 0n, 0n);
      for (let i = 0; i < MAX_MOVES; i++) await sendMove(game, alice, i % 2 === 0 ? E : W);
      await expect(sendMove(game, alice, E)).to.be.reverted;
      await expect(game.connect(bob).finish(id)).to.emit(game, "RunEnded").withArgs(id);
    });

    it("18 packed path decodes to the input sequence", async function () {
      const id = await startFixed(game, alice, 0n, 0n);
      const dirs = [E, S, S, W, N, E, E, S];
      for (const d of dirs) await sendMove(game, alice, d);
      const s = await readState(game, id);
      expect(decodePath(s.path, s.moves)).to.deep.eq(dirs);
    });
  });

  describe("differential vs plaintext reference", function () {
    const seeds = Number(process.env.DIFF_SEEDS ?? 25);
    let rng = 0x9e3779b9;
    const rand = () => {
      rng ^= rng << 13;
      rng ^= rng >>> 17;
      rng ^= rng << 5;
      return (rng >>> 0) / 0x100000000;
    };
    const randWord = () => {
      let w = 0n;
      for (let i = 0; i < 64; i++) if (rand() < 0.125) w |= 1n << BigInt(i);
      return w;
    };

    it(`matches for ${seeds} random maps and 24-step walks`, async function () {
      this.timeout(0);
      for (let seed = 0; seed < seeds; seed++) {
        const hazards = randWord() & ~0x103n;
        const prizes = randWord() & ~hazards & ~1n;
        const dirs = Array.from({ length: MAX_MOVES }, () => Math.floor(rand() * 4));
        const id = await startFixed(game, alice, hazards, prizes);
        let ref = start(hazards, prizes);
        expectSameState(await readState(game, id), ref, `seed ${seed} start`);
        for (let i = 0; i < dirs.length; i++) {
          await sendMove(game, alice, dirs[i]);
          ref = step(ref, dirs[i]);
          expectSameState(
            await readState(game, id),
            ref,
            `seed ${seed} step ${i}\n hazards ${hazards} prizes ${prizes}\n dirs ${dirs.slice(0, i + 1)}`,
          );
        }
        await (await game.connect(alice).finish(id)).wait();
        expect(await scoreOf(id)).to.eq(score(ref));
      }
    });
  });
});
