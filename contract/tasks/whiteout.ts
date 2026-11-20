import { FhevmType } from "@fhevm/hardhat-plugin";
import { writeFileSync } from "node:fs";
import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const EAST = 3;
const WEST = 2;

async function connect(hre: HardhatRuntimeEnvironment, address?: string) {
  const { ethers, deployments, network } = hre;
  let addr = address;
  if (!addr) {
    try {
      addr = (await deployments.get("Whiteout")).address;
    } catch {
      throw new Error("Whiteout is not deployed on " + network.name + ". Run: npx hardhat deploy --network " + network.name);
    }
  }
  return { addr, game: await ethers.getContractAt("Whiteout", addr) };
}

const ms = (t0: number) => Math.round(performance.now() - t0);

/**
 * Scripted full run for the Sepolia smoke test (docs/TEST_PLAN.md section 9):
 * start, walk east and west so every step stays in the safe zone, finish at the cabin, finalize with proof.
 * It prints each step's transaction time and user-decrypt time, which answers the latency question in
 * docs/ARCHITECTURE.md section 10, and records the transaction hashes for the README.
 */
task("whiteout:smoke", "Plays a scripted run and prints timings and transaction hashes")
  .addOptionalParam("address", "Whiteout address, defaults to the deployment")
  .addOptionalParam("steps", "Number of steps, even so the run ends at the cabin", "8")
  .setAction(async (args, hre) => {
    const { ethers, fhevm, network } = hre;
    // localhost needs `npx hardhat node` running, sepolia needs funded keys; the in-process network has no FHEVM mock outside tests
    if (network.name === "hardhat") throw new Error("Use --network localhost (with npx hardhat node running) or --network sepolia.");
    await fhevm.initializeCLIApi();
    const steps = Number(args.steps);
    if (!Number.isInteger(steps) || steps < 0 || steps % 2 !== 0 || steps > 24) throw new Error("--steps must be an even number from 0 to 24");

    const [player] = await ethers.getSigners();
    const { addr, game } = await connect(hre, args.address);
    console.log(`network ${network.name}, contract ${addr}, player ${player.address}`);

    const report: Record<string, unknown> = { network: network.name, contract: addr, player: player.address, steps: [] as unknown[] };

    let t = performance.now();
    const startRc = await (await game.connect(player).startRun()).wait();
    const runId = await game.activeRunOf(player.address);
    console.log(`startRun  run ${runId}  tx ${startRc!.hash}  ${ms(t)} ms  gas ${startRc!.gasUsed}`);
    report.runId = runId.toString();
    report.startTx = startRc!.hash;

    const perStep: { n: number; txMs: number; decryptMs: number; gas: string; hash: string }[] = [];
    for (let i = 0; i < steps; i++) {
      const dir = i % 2 === 0 ? EAST : WEST;
      t = performance.now();
      const enc = await fhevm.createEncryptedInput(addr, player.address).add8(dir).encrypt();
      const encMs = ms(t);
      t = performance.now();
      const rc = await (await game.connect(player).move(enc.handles[0], enc.inputProof)).wait();
      const txMs = ms(t);

      t = performance.now();
      const h = await game.getHandles(runId);
      const pos = await fhevm.userDecryptEuint(FhevmType.euint64, h.pos, addr, player);
      const decryptMs = ms(t);
      const expected = dir === EAST ? 2n : 1n;
      if (pos !== expected) throw new Error(`step ${i + 1}: expected position bit ${expected}, got ${pos}`);
      perStep.push({ n: i + 1, txMs, decryptMs, gas: rc!.gasUsed.toString(), hash: rc!.hash });
      console.log(`step ${String(i + 1).padStart(2)}  ${dir === EAST ? "east" : "west"}  encrypt ${encMs} ms  tx ${txMs} ms  decrypt ${decryptMs} ms  gas ${rc!.gasUsed}  ${rc!.hash}`);
    }
    report.steps = perStep;

    t = performance.now();
    const finRc = await (await game.connect(player).finish(runId)).wait();
    console.log(`finish    tx ${finRc!.hash}  ${ms(t)} ms`);
    report.finishTx = finRc!.hash;

    t = performance.now();
    const h = await game.getHandles(runId);
    const res = await fhevm.publicDecrypt([h.hazards, h.prizesInitial, h.path, h.score]);
    const pdMs = ms(t);
    t = performance.now();
    const finalRc = await (await game.finalize(runId, res.abiEncodedClearValues, res.decryptionProof)).wait();
    console.log(`finalize  tx ${finalRc!.hash}  public decrypt ${pdMs} ms  tx ${ms(t)} ms`);
    report.finalizeTx = finalRc!.hash;

    const result = await game.getResult(runId);
    console.log(`result    score ${result.score}  pits 0x${BigInt(result.hazards).toString(16)}  relics 0x${BigInt(result.prizes).toString(16)}`);
    report.score = Number(result.score);

    if (perStep.length) {
      const avg = (f: (s: (typeof perStep)[number]) => number) => Math.round(perStep.reduce((a, s) => a + f(s), 0) / perStep.length);
      const worst = Math.max(...perStep.map((s) => s.txMs + s.decryptMs));
      console.log(`\nper step average: tx ${avg((s) => s.txMs)} ms, decrypt ${avg((s) => s.decryptMs)} ms, worst total ${worst} ms`);
      console.log("ARCHITECTURE.md open question 6: if one step takes more than about 8000 ms, redesign around queued input.");
      report.summary = { avgTxMs: avg((s) => s.txMs), avgDecryptMs: avg((s) => s.decryptMs), worstTotalMs: worst };
    }
    writeFileSync(`smoke-${network.name}.json`, JSON.stringify(report, null, 2));
    console.log(`written smoke-${network.name}.json`);
  });
