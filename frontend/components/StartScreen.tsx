"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SEPOLIA_CHAIN_ID } from "@/lib/abi";
import { connectWallet, contractConfigured, hasWallet, LOW_GAS_WEI, switchToSepolia, type Wallet } from "@/lib/chain";
import { HowToPlayButton } from "./HowToPlay";
import { Scene } from "./Scene";
import { Pilgrim, shortAddr } from "./Pixel";

export function StartScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  // read after mount: the server render cannot know whether a wallet extension exists
  const [hasEth, setHasEth] = useState(false);
  useEffect(() => setHasEth(hasWallet()), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      setWallet(await connectWallet());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const switchNet = async () => {
    setError(null);
    try {
      await switchToSepolia();
      setWallet(await connectWallet());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const wrongNet = !!wallet && wallet.chainId !== SEPOLIA_CHAIN_ID;
  const noGas = !!wallet && !wrongNet && wallet.balance === 0n;
  const lowGas = !!wallet && !wrongNet && wallet.balance !== null && wallet.balance > 0n && wallet.balance < LOW_GAS_WEI;
  const ready = contractConfigured();

  return (
    <div className="root">
      <Scene />
      <div className="snow snowA" />
      <div className="snow snowB" />

      <header className="row hdr">
        <span className="logo" style={{ fontSize: 28, textShadow: "3px 3px 0 var(--red)" }}>Whiteout</span>
        <div style={{ flex: "1 1 0" }} />
        <span className="row" style={{ alignItems: "center", gap: 8, fontSize: 14 }}>
          <span className="dotnet" />
          Sepolia
        </span>
        {wallet && <span className="hash">{shortAddr(wallet.address)}</span>}
        <Link href="/leaderboard" className="btn sm alt">Leaderboard</Link>
      </header>

      {wrongNet && (
        <div className="notice" role="alert">
          <span>Switch to Sepolia to play.</span>
          <button type="button" className="btn sm" onClick={() => void switchNet()}>Switch network</button>
        </div>
      )}

      <section className="hero">
        <h1>Whiteout</h1>
        <p className="tag">The chain can’t see you die.</p>
        <p>Climb a snowbound temple with one lantern and 24 steps. The map, your position and whether you still live stay encrypted until you finish.</p>
        <div className="row" style={{ gap: 6, marginTop: 22, flexWrap: "wrap", alignItems: "center" }}>
          {!wallet ? (
            <button type="button" className="btn lg" disabled={busy || !hasEth} onClick={() => void connect()}>
              {busy ? "Connecting..." : "Connect wallet"}
            </button>
          ) : wrongNet ? null : noGas ? (
            <button type="button" className="btn lg" onClick={() => void connect()}>Check balance again</button>
          ) : ready ? (
            <Link href="/run/new" className="btn lg">Start run</Link>
          ) : (
            <button type="button" className="btn lg" disabled>Contract not deployed yet</button>
          )}
          <Link href="/practice" className="btn alt lg">Practice run</Link>
          <HowToPlayButton className="btn alt lg" />
        </div>
        {noGas && (
          <p className="sub" role="alert" style={{ marginTop: 10, color: "#ffd98a" }}>
            This wallet has no Sepolia ETH, so it cannot pay for steps. Get some from a faucet, then check again.{" "}
            <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer" style={{ color: "var(--amber)" }}>Open a faucet</a>.
          </p>
        )}
        {lowGas && (
          <p className="sub" role="status" style={{ marginTop: 10, color: "#ffd98a" }}>
            Low balance. A full run can send up to 27 transactions (start, 24 steps, finish, finalize), so this wallet may run dry. You can still start.
          </p>
        )}
        {!hasEth && <p className="sub" style={{ marginTop: 10 }}>No browser wallet found. Install one to play on Sepolia, or try a practice run.</p>}
        {error && <p className="sub" role="alert" style={{ marginTop: 10, color: "#f0806f" }}>{error}</p>}
        <p className="sub" style={{ marginTop: 14, maxWidth: "52ch" }}>
          Practice runs play on your device, with nothing encrypted. Real runs need Sepolia ETH for gas.{" "}
          <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer" style={{ color: "var(--amber)" }}>Get Sepolia ETH</a>.
        </p>
      </section>

      <Pilgrim variant="down" bob className="walker" />

      <section className="explain" aria-label="What the chain sees">
        <div className="panel">
          <div className="h2" style={{ fontSize: 26 }}>What the chain sees, and what only you see</div>
          <div className="explain-grid">
            <div>
              <div className="explain-h">Public on Sepolia</div>
              <ul>
                <li>That a run started, and by which wallet</li>
                <li>How many steps were taken</li>
                <li>Opaque ciphertext handles that change every step</li>
              </ul>
            </div>
            <div>
              <div className="explain-h">Only you can read</div>
              <ul>
                <li>Your position and your moves</li>
                <li>Whether you are still alive</li>
                <li>The Cold and Glint signals after each step</li>
              </ul>
            </div>
            <div>
              <div className="explain-h">Opened when you finish</div>
              <ul>
                <li>The map: pits and relics</li>
                <li>Your exact path and your score</li>
                <li>Checked by a signed proof, so anyone can replay it</li>
              </ul>
            </div>
          </div>
          <p className="sub" style={{ marginTop: 10 }}>If the state were public, the next player would copy every pit and there would be no game.</p>
        </div>
      </section>

      <div className="three">
        <div className="panel"><div className="h2">24 steps of oil</div><div className="sub">The storm closes at zero.</div></div>
        <div className="panel"><div className="h2">Bring relics home</div><div className="sub">Only if you finish alive.</div></div>
        <div className="panel"><div className="h2">Read the signals</div><div className="sub">Cold means a pit is near.</div></div>
      </div>
    </div>
  );
}
