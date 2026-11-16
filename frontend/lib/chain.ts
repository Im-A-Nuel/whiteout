"use client";

import { BrowserProvider, Contract, JsonRpcProvider, type Eip1193Provider, type JsonRpcSigner } from "ethers";
import { SEPOLIA_CHAIN_HEX, SEPOLIA_CHAIN_ID, SEPOLIA_RPC, WHITEOUT_ABI, WHITEOUT_ADDRESS } from "./abi";
import { decodePath } from "./engine";
import type { Driver, Reveal, RunInit, StepResult } from "./driver";

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { on?: (e: string, cb: (...a: any[]) => void) => void };
  }
}

export const hasWallet = (): boolean => typeof window !== "undefined" && !!window.ethereum;
export const contractConfigured = (): boolean => WHITEOUT_ADDRESS.length > 0;

export interface Wallet {
  address: string;
  chainId: number;
  signer: JsonRpcSigner;
  provider: BrowserProvider;
}

export async function connectWallet(): Promise<Wallet> {
  if (!window.ethereum) throw new Error("No wallet found. Install a browser wallet to play on Sepolia.");
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  return { address: await signer.getAddress(), chainId: Number(network.chainId), signer, provider };
}

export async function switchToSepolia(): Promise<void> {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_HEX }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [SEPOLIA_RPC],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else throw e;
  }
}

export const readProvider = () => new JsonRpcProvider(SEPOLIA_RPC, SEPOLIA_CHAIN_ID);
export const readContract = () => new Contract(WHITEOUT_ADDRESS, WHITEOUT_ABI, readProvider());

/* ----------------------------------------------------------------- relayer */

let relayerPromise: Promise<any> | null = null;

/** The relayer SDK is WASM and browser-only, so it is imported dynamically and cached. */
export function getRelayer(): Promise<any> {
  if (!relayerPromise) {
    relayerPromise = (async () => {
      const sdk: any = await import("@zama-fhe/relayer-sdk/web");
      await sdk.initSDK();
      return sdk.createInstance({ ...sdk.SepoliaConfig, network: window.ethereum });
    })().catch((e) => {
      relayerPromise = null;
      throw e;
    });
  }
  return relayerPromise;
}

interface Permit {
  publicKey: string;
  privateKey: string;
  signature: string;
  start: number;
  days: number;
  user: string;
}
let permit: Permit | null = null;

/** One wallet signature per session, reused for every step. Kept in memory only. */
async function getPermit(instance: any, wallet: Wallet): Promise<Permit> {
  const now = Math.floor(Date.now() / 1000);
  if (permit && permit.user === wallet.address && now < permit.start + permit.days * 86400 - 60) return permit;
  const { publicKey, privateKey } = instance.generateKeypair();
  const days = 1;
  const eip712 = instance.createEIP712(publicKey, [WHITEOUT_ADDRESS], now, days);
  const signature = await wallet.signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );
  permit = { publicKey, privateKey, signature: signature.replace("0x", ""), start: now, days, user: wallet.address };
  return permit;
}

async function userDecrypt(wallet: Wallet, handles: string[]): Promise<Record<string, bigint | boolean>> {
  const instance = await getRelayer();
  const p = await getPermit(instance, wallet);
  const pairs = handles.map((h) => ({ handle: h, contractAddress: WHITEOUT_ADDRESS }));
  return instance.userDecrypt(pairs, p.privateKey, p.publicKey, p.signature, [WHITEOUT_ADDRESS], wallet.address, p.start, p.days);
}

/* ------------------------------------------------------------------ driver */

const bitToCell = (b: bigint): number => (b === 0n ? 0 : b.toString(2).length - 1);

export class ChainDriver implements Driver {
  readonly mode = "chain" as const;
  readonly label = "Sepolia";
  runId = "";
  private contract: Contract;

  constructor(private wallet: Wallet, existingRunId?: string) {
    this.contract = new Contract(WHITEOUT_ADDRESS, WHITEOUT_ABI, wallet.signer);
    if (existingRunId) this.runId = existingRunId;
  }

  async begin(): Promise<RunInit> {
    if (!this.runId) {
      const tx = await this.contract.startRun();
      await tx.wait();
      this.runId = (await this.contract.activeRunOf(this.wallet.address)).toString();
    }
    return { runId: this.runId, step0: await this.readState() };
  }

  /** Reads and decrypts the player's own state for the current run. */
  async readState(txHash?: string): Promise<StepResult> {
    const h = await this.contract.getHandles(this.runId);
    const values = await userDecrypt(this.wallet, [h.pos, h.alive, h.collected, h.dangerNear, h.prizeNear]);
    return {
      pos: bitToCell(values[h.pos] as bigint),
      alive: values[h.alive] as boolean,
      collected: Number(values[h.collected] as bigint),
      cold: values[h.dangerNear] as boolean,
      glint: values[h.prizeNear] as boolean,
      handles: { pos: h.pos, alive: h.alive, hazards: h.hazards },
      txHash,
    };
  }

  async move(dir: number): Promise<StepResult> {
    const instance = await getRelayer();
    const input = instance.createEncryptedInput(WHITEOUT_ADDRESS, this.wallet.address);
    input.add8(dir);
    const enc = await input.encrypt();
    const tx = await this.contract.move(enc.handles[0], enc.inputProof);
    const receipt = await tx.wait();
    return this.readState(receipt?.hash ?? tx.hash);
  }

  async finish(onPhase?: (p: "finishing" | "finalizing") => void): Promise<Reveal> {
    onPhase?.("finishing");
    const run = await this.contract.getRun(this.runId);
    if (!run.ended) await (await this.contract.finish(this.runId)).wait();

    onPhase?.("finalizing");
    const h = await this.contract.getHandles(this.runId);
    const instance = await getRelayer();
    const res = await instance.publicDecrypt([h.hazards, h.prizesInitial, h.path, h.score]);
    const tx = await this.contract.finalize(this.runId, res.abiEncodedClearValues, res.decryptionProof);
    const receipt = await tx.wait();

    const result = await this.contract.getResult(this.runId);
    const moves = Number((await this.contract.getRun(this.runId)).moves);
    return {
      hazards: BigInt(result.hazards),
      prizes: BigInt(result.prizes),
      dirs: decodePath(BigInt(result.path), moves),
      score: Number(result.score),
      finalizeTx: receipt?.hash ?? tx.hash,
      hazardsHandle: h.hazards,
    };
  }
}

/** Past finalized runs for the leaderboard, built from RunFinalized events. */
export async function fetchFinalized(): Promise<
  { runId: string; player: string; score: number; steps: number; hazards: bigint; prizes: bigint; path: bigint }[]
> {
  const c = readContract();
  const logs = await c.queryFilter(c.filters.RunFinalized(), -50000);
  const out = [];
  for (const l of logs as any[]) {
    const run = await c.getRun(l.args.runId);
    out.push({
      runId: l.args.runId.toString(),
      player: l.args.player as string,
      score: Number(l.args.score),
      steps: Number(run.moves),
      hazards: BigInt(l.args.hazards),
      prizes: BigInt(l.args.prizes),
      path: BigInt(l.args.path),
    });
  }
  return out.sort((a, b) => b.score - a.score || a.steps - b.steps);
}

/** Loads a finalized run's public data for the replay screen without needing a wallet. */
export async function fetchRevealed(runId: string): Promise<Reveal | null> {
  const c = readContract();
  const run = await c.getRun(runId);
  if (!run.finalized) return null;
  const r = await c.getResult(runId);
  const h = await c.getHandles(runId);
  return {
    hazards: BigInt(r.hazards),
    prizes: BigInt(r.prizes),
    dirs: decodePath(BigInt(r.path), Number(run.moves)),
    score: Number(r.score),
    hazardsHandle: h.hazards,
  };
}
