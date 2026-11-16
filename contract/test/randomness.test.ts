import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { deployReal } from "./helpers";

const popcount = (x: bigint) => x.toString(2).replace(/0/g, "").length;

describe("Whiteout map randomness (mock)", function () {
  let alice: HardhatEthersSigner;
  const maps = Number(process.env.RAND_MAPS ?? 120);

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();
    [, alice] = await ethers.getSigners();
  });

  it(`${maps} maps: safe zone, no overlap, mean pit count near 8, no stuck bits`, async function () {
    this.timeout(0);
    const { game } = await deployReal();
    const density = new Array<number>(64).fill(0);
    let pits = 0;
    let prizes = 0;
    for (let i = 0; i < maps; i++) {
      await (await game.connect(alice).startRun()).wait();
      const id = await game.activeRunOf(alice.address);
      const h = await game.getHandles(id);
      const hz = await fhevm.debugger.decryptEuint(FhevmType.euint64, h.hazards);
      const pz = await fhevm.debugger.decryptEuint(FhevmType.euint64, h.prizesInitial);
      expect(hz & 0x103n, "pit in safe zone").to.eq(0n);
      expect(pz & hz, "treasure on a pit").to.eq(0n);
      expect(pz & 1n, "treasure on the cabin").to.eq(0n);
      pits += popcount(hz);
      prizes += popcount(pz);
      for (let b = 0; b < 64; b++) if ((hz >> BigInt(b)) & 1n) density[b]++;
      await (await game.connect(alice).finish(id)).wait();
    }
    const meanPits = pits / maps;
    console.log(`      mean pits ${meanPits.toFixed(2)}, mean treasure ${(prizes / maps).toFixed(2)}`);
    // 61 eligible cells at p = 1/8 gives a mean near 7.6
    expect(meanPits).to.be.within(6, 9.2);
    // no bit that should be live is stuck at zero or one over the sample
    for (let b = 0; b < 64; b++) {
      if ([0, 1, 8].includes(b)) continue;
      expect(density[b], `bit ${b} stuck high`).to.be.lessThan(maps * 0.5);
    }
    const dead = density.filter((d, b) => ![0, 1, 8].includes(b) && d === 0).length;
    expect(dead, "bits that never became a pit").to.be.lessThan(4);
  });
});
