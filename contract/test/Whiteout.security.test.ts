import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { WhiteoutHarness } from "../types";
import { deployHarness, sendMove, startFixed } from "./helpers";
import { cell, Dir } from "./reference";

const E = Dir.East;
const S = Dir.South;
const W = Dir.West;

describe("Whiteout confidentiality and access control", function () {
  let game: WhiteoutHarness;
  let address: string;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();
    [, alice, bob] = await ethers.getSigners();
    ({ game, address } = await deployHarness());
  });

  describe("confidentiality", function () {
    it("C1 and C2 player cannot user-decrypt hazards or prizes before Finish", async function () {
      const id = await startFixed(game, alice, cell(3, 3), cell(4, 4));
      await sendMove(game, alice, E);
      const h = await game.getHandles(id);
      await expect(fhevm.userDecryptEuint(FhevmType.euint64, h.hazards, address, alice)).to.be.rejected;
      await expect(fhevm.userDecryptEuint(FhevmType.euint64, h.prizesInitial, address, alice)).to.be.rejected;
    });

    it("C3 another address cannot decrypt the player's position", async function () {
      const id = await startFixed(game, alice, 0n, 0n);
      await sendMove(game, alice, E);
      const h = await game.getHandles(id);
      await expect(fhevm.userDecryptEuint(FhevmType.euint64, h.pos, address, bob)).to.be.rejected;
      await expect(fhevm.userDecryptEbool(h.alive, address, bob)).to.be.rejected;
    });

    it("C4 player decrypts own position, alive, pack and signals", async function () {
      const id = await startFixed(game, alice, cell(1, 1), cell(0, 2));
      await sendMove(game, alice, E);
      const h = await game.getHandles(id);
      expect(await fhevm.userDecryptEuint(FhevmType.euint64, h.pos, address, alice)).to.eq(cell(0, 1));
      expect(await fhevm.userDecryptEbool(h.alive, address, alice)).to.eq(true);
      expect(await fhevm.userDecryptEuint(FhevmType.euint8, h.collected, address, alice)).to.eq(0n);
      expect(await fhevm.userDecryptEbool(h.dangerNear, address, alice)).to.eq(true);
      expect(await fhevm.userDecryptEbool(h.prizeNear, address, alice)).to.eq(true);
    });

    it("C5 after Finish map, path and score are publicly decryptable and finalize verifies", async function () {
      const hazards = cell(3, 3);
      const prizes = cell(0, 1);
      const id = await startFixed(game, alice, hazards, prizes);
      await sendMove(game, alice, E);
      await sendMove(game, alice, W);
      await (await game.connect(alice).finish(id)).wait();

      const h = await game.getHandles(id);
      const res = await fhevm.publicDecrypt([h.hazards, h.prizesInitial, h.path, h.score]);
      await expect(game.connect(bob).finalize(id, res.abiEncodedClearValues, res.decryptionProof))
        .to.emit(game, "RunFinalized")
        .withArgs(id, alice.address, 1, hazards, prizes, 0b1110);

      const result = await game.getResult(id);
      expect(result.score).to.eq(1);
      expect(result.hazards).to.eq(hazards);
      expect(result.prizes).to.eq(prizes);
      expect((await game.getRun(id)).finalized).to.eq(true);
    });

    it("C6 and C7 events leak no direction, position or map and look identical across runs", async function () {
      const logsOf = async (dirs: number[]) => {
        await (await game.setNextMap(cell(5, 5), cell(2, 2))).wait();
        await (await game.connect(alice).startRun()).wait();
        const out: { topic: string; len: number }[] = [];
        for (const d of dirs) {
          const rc = await sendMove(game, alice, d);
          for (const log of rc!.logs) {
            if (log.address.toLowerCase() === address.toLowerCase()) {
              out.push({ topic: log.topics[0], len: log.data.length });
            }
          }
        }
        await (await game.connect(alice).finish(await game.activeRunOf(alice.address))).wait();
        return out;
      };
      const a = await logsOf([E, E, E, S]);
      const id1 = await game.runCount();
      const b = await logsOf([S, S, W, W]);
      expect(id1).to.eq(1n);
      expect(a).to.deep.eq(b);
      const moved = game.interface.getEvent("Moved").topicHash;
      for (const l of a) {
        expect(l.topic).to.eq(moved);
        expect(l.len).to.eq(2 + 64); // one uint8 word, nothing else
      }
    });
  });

  describe("access control and robustness", function () {
    it("A1 non-owner cannot move", async function () {
      await startFixed(game, alice, 0n, 0n);
      await expect(sendMove(game, bob, E)).to.be.revertedWithCustomError(game, "NoActiveRun");
    });

    it("A1b non-owner cannot finish early", async function () {
      const id = await startFixed(game, alice, 0n, 0n);
      await expect(game.connect(bob).finish(id)).to.be.revertedWithCustomError(game, "NotRunOwner");
    });

    it("A2 cannot start while a run is active, can start again after Finish", async function () {
      const id = await startFixed(game, alice, 0n, 0n);
      await expect(game.connect(alice).startRun()).to.be.revertedWithCustomError(game, "RunAlreadyActive");
      await (await game.connect(alice).finish(id)).wait();
      await expect(game.connect(alice).startRun()).to.emit(game, "RunStarted");
    });

    it("A3 move after Finish reverts", async function () {
      const id = await startFixed(game, alice, 0n, 0n);
      await (await game.connect(alice).finish(id)).wait();
      await expect(sendMove(game, alice, E)).to.be.revertedWithCustomError(game, "NoActiveRun");
    });

    it("A4 tampered proof is rejected", async function () {
      const id = await startFixed(game, alice, cell(3, 3), 0n);
      await (await game.connect(alice).finish(id)).wait();
      const h = await game.getHandles(id);
      const res = await fhevm.publicDecrypt([h.hazards, h.prizesInitial, h.path, h.score]);
      const forged = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint64", "uint64", "uint64", "uint8"],
        [0, 0, 0, 8],
      );
      await expect(game.finalize(id, forged, res.decryptionProof)).to.be.reverted;
    });

    it("A5 finalize twice reverts", async function () {
      // distinct non-zero words: trivially encrypted zeros share one handle and cannot be proven together
      const id = await startFixed(game, alice, cell(3, 3), cell(0, 1));
      await sendMove(game, alice, E);
      await (await game.connect(alice).finish(id)).wait();
      const h = await game.getHandles(id);
      const res = await fhevm.publicDecrypt([h.hazards, h.prizesInitial, h.path, h.score]);
      await (await game.finalize(id, res.abiEncodedClearValues, res.decryptionProof)).wait();
      await expect(
        game.finalize(id, res.abiEncodedClearValues, res.decryptionProof),
      ).to.be.revertedWithCustomError(game, "AlreadyFinalized");
    });

    it("A6 finalize before Finish reverts", async function () {
      const id = await startFixed(game, alice, 0n, 0n);
      await expect(game.finalize(id, "0x", "0x")).to.be.revertedWithCustomError(game, "NotEnded");
    });

    it("unknown run id reverts", async function () {
      await expect(game.finish(99)).to.be.revertedWithCustomError(game, "UnknownRun");
    });
  });
});
