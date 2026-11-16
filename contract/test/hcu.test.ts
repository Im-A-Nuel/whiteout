import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { deployHarness, deployReal, sendMove, startFixed } from "./helpers";
import { cell, Dir } from "./reference";

/** Per-transaction HCU budget. The docs start at 3,000,000 and the global cap is 20,000,000. */
const MOVE_BUDGET = 3_000_000;
const DEPTH_CAP = 5_000_000;

describe("Whiteout HCU", function () {
  let alice: HardhatEthersSigner;

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();
    [, alice] = await ethers.getSigners();
  });

  it("measures startRun, move and finish", async function () {
    const real = await deployReal();
    const startRc = await (await real.game.connect(alice).startRun()).wait();
    const start = fhevm.computeTransactionHCU(startRc!);

    const { game } = await deployHarness();
    const id = await startFixed(game, alice, cell(5, 5), cell(2, 2));
    const moveRc = await sendMove(game, alice, Dir.East);
    const move = fhevm.computeTransactionHCU(moveRc!);
    const finishRc = await (await game.connect(alice).finish(id)).wait();
    const fin = fhevm.computeTransactionHCU(finishRc!);

    console.log(`      startRun  global ${start.globalHCU}  depth ${start.maxHCUDepth}`);
    console.log(`      move      global ${move.globalHCU}  depth ${move.maxHCUDepth}`);
    console.log(`      finish    global ${fin.globalHCU}  depth ${fin.maxHCUDepth}`);

    expect(move.globalHCU).to.be.lessThan(MOVE_BUDGET);
    expect(move.maxHCUDepth).to.be.lessThan(DEPTH_CAP);
    expect(start.globalHCU).to.be.lessThan(MOVE_BUDGET);
    expect(fin.globalHCU).to.be.lessThan(MOVE_BUDGET);
  });
});
