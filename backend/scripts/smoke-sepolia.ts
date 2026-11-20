/**
 * Scripted full run on Sepolia (docs/TEST_PLAN.md section 9): start, N steps walking east and west so every
 * step stays inside the safe zone, finish at the cabin, finalize with the KMS proof.
 * It prints the time of every step (encrypt, transaction, user decrypt) which answers the latency question in
 * docs/ARCHITECTURE.md section 10, and writes smoke-sepolia.json with the transaction hashes for the README.
 *
 *   SEPOLIA_RPC_URL=...  WHITEOUT_ADDRESS=0x...  PRIVATE_KEY=0x...  npm run smoke:sepolia -- 8
 *
 * Use a throwaway demo wallet for PRIVATE_KEY. The key is read from the environment only and never written anywhere.
 */
import { writeFileSync } from "node:fs";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import { WHITEOUT_ABI } from "../../frontend/lib/abi";

const EAST = 3;
const WEST = 2;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Set ${name} in the environment.`);
  return v;
}

const ms = (t0: number) => Math.round(performance.now() - t0);

/** The script stops instead of spending below this balance. */
const FLOOR_WEI = 5_000_000_000_000_000n; // 0.005 ETH
const eth = (wei: bigint) => (Number(wei) / 1e18).toFixed(9);

async function main() {
  const steps = Number(process.argv[2] ?? 8);
  if (!Number.isInteger(steps) || steps < 0 || steps % 2 !== 0 || steps > 24) throw new Error("steps must be an even number from 0 to 24");

  const rpc = env("SEPOLIA_RPC_URL");
  const address = env("WHITEOUT_ADDRESS");
  const provider = new JsonRpcProvider(rpc);
  const wallet = new Wallet(env("PRIVATE_KEY"), provider);
  const game = new Contract(address, WHITEOUT_ABI as unknown as string[], wallet);
  const instance = await createInstance({ ...SepoliaConfig, network: rpc });

  const startBalance = await provider.getBalance(wallet.address);
  console.log(`contract ${address}, player ${wallet.address}, balance ${eth(startBalance)} ETH`);
  const ensureFunds = async (what: string) => {
    const b = await provider.getBalance(wallet.address);
    if (b < FLOOR_WEI) throw new Error(`stopping before ${what}: balance ${eth(b)} ETH is under the ${eth(FLOOR_WEI)} ETH floor`);
  };
  await ensureFunds("start");
  let spent = 0n;
  const track = <T extends { fee: bigint }>(rc: T): T => {
    spent += rc.fee;
    return rc;
  };

  // preflight: prove the relayer answers before any transaction is sent
  {
    const t0 = performance.now();
    const probe = instance.createEncryptedInput(address, wallet.address);
    probe.add8(EAST);
    await probe.encrypt();
    console.log(`preflight  relayer encrypted a test input in ${ms(t0)} ms (nothing sent)`);
  }

  // one permit for the whole run, like the app
  const { publicKey, privateKey } = instance.generateKeypair();
  const permitStart = Math.floor(Date.now() / 1000);
  const eip712 = instance.createEIP712(publicKey, [address], permitStart, 1);
  const signature = await wallet.signTypedData(eip712.domain, { UserDecryptRequestVerification: [...eip712.types.UserDecryptRequestVerification] }, eip712.message);
  const decryptPos = async (handle: string): Promise<bigint> => {
    const out = await instance.userDecrypt([{ handle, contractAddress: address }], privateKey, publicKey, signature.replace("0x", ""), [address], wallet.address, permitStart, 1);
    return BigInt(out[handle as `0x${string}`] as bigint);
  };

  const report: Record<string, unknown> = { contract: address, player: wallet.address };
  const perStep: { n: number; encryptMs: number; txMs: number; decryptMs: number; gas: string; hash: string }[] = [];

  let t = performance.now();
  const startTx = await game.startRun();
  const startRc = track(await startTx.wait());
  const runId = await game.activeRunOf(wallet.address);
  console.log(`startRun  run ${runId}  tx ${startRc.hash}  ${ms(t)} ms  gas ${startRc.gasUsed}  cost ${eth(startRc.fee)} ETH`);
  report.runId = runId.toString();
  report.startTx = startRc.hash;

  for (let i = 0; i < steps; i++) {
    const dir = i % 2 === 0 ? EAST : WEST;
    await ensureFunds(`step ${i + 1}`);
    t = performance.now();
    const input = instance.createEncryptedInput(address, wallet.address);
    input.add8(dir);
    const enc = await input.encrypt();
    const encryptMs = ms(t);

    t = performance.now();
    const rc = track(await (await game.move(enc.handles[0], enc.inputProof)).wait());
    const txMs = ms(t);

    t = performance.now();
    const h = await game.getHandles(runId);
    const pos = await decryptPos(h.pos);
    const decryptMs = ms(t);
    const expected = dir === EAST ? 2n : 1n;
    if (pos !== expected) throw new Error(`step ${i + 1}: expected position bit ${expected}, got ${pos}`);
    perStep.push({ n: i + 1, encryptMs, txMs, decryptMs, gas: rc.gasUsed.toString(), hash: rc.hash });
    console.log(`step ${String(i + 1).padStart(2)}  ${dir === EAST ? "east" : "west"}  encrypt ${encryptMs} ms  tx ${txMs} ms  decrypt ${decryptMs} ms  gas ${rc.gasUsed}  cost ${eth(rc.fee)} ETH  ${rc.hash}`);
  }
  report.steps = perStep;

  t = performance.now();
  await ensureFunds("finish");
  const finRc = track(await (await game.finish(runId)).wait());
  console.log(`finish    tx ${finRc.hash}  ${ms(t)} ms  gas ${finRc.gasUsed}  cost ${eth(finRc.fee)} ETH`);
  report.finishTx = finRc.hash;

  t = performance.now();
  const h = await game.getHandles(runId);
  const res = await instance.publicDecrypt([h.hazards, h.prizesInitial, h.path, h.score]);
  const publicMs = ms(t);
  t = performance.now();
  await ensureFunds("finalize");
  const finalRc = track(await (await game.finalize(runId, res.abiEncodedClearValues, res.decryptionProof)).wait());
  console.log(`finalize  tx ${finalRc.hash}  public decrypt ${publicMs} ms  tx ${ms(t)} ms  gas ${finalRc.gasUsed}  cost ${eth(finalRc.fee)} ETH`);
  report.finalizeTx = finalRc.hash;

  const result = await game.getResult(runId);
  console.log(`result    score ${result.score}  pits 0x${BigInt(result.hazards).toString(16)}  relics 0x${BigInt(result.prizes).toString(16)}`);
  report.score = Number(result.score);

  if (perStep.length) {
    const avg = (f: (s: (typeof perStep)[number]) => number) => Math.round(perStep.reduce((a, s) => a + f(s), 0) / perStep.length);
    const worst = Math.max(...perStep.map((s) => s.encryptMs + s.txMs + s.decryptMs));
    console.log(`\nper step average: encrypt ${avg((s) => s.encryptMs)} ms, tx ${avg((s) => s.txMs)} ms, decrypt ${avg((s) => s.decryptMs)} ms, worst total ${worst} ms`);
    console.log("ARCHITECTURE.md open question 6: if one step takes more than about 8000 ms, redesign around queued input.");
    report.summary = { avgEncryptMs: avg((s) => s.encryptMs), avgTxMs: avg((s) => s.txMs), avgDecryptMs: avg((s) => s.decryptMs), worstTotalMs: worst };
  }
  console.log(`\ntotal spent ${eth(spent)} ETH, balance now ${eth(await provider.getBalance(wallet.address))} ETH`);
  report.spentEth = eth(spent);
  writeFileSync("smoke-sepolia.json", JSON.stringify(report, null, 2));
  console.log("written smoke-sepolia.json");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
