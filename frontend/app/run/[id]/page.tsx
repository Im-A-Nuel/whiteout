"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { GameScreen, Header, type ViewMode } from "@/components/GameScreen";
import { RevealScreen } from "@/components/RevealScreen";
import { SEPOLIA_CHAIN_ID } from "@/lib/abi";
import { ChainDriver, connectWallet, contractConfigured, fetchRevealed, hasWallet, switchToSepolia, type Wallet } from "@/lib/chain";
import type { Reveal } from "@/lib/driver";

type Load = { kind: "checking" } | { kind: "public"; reveal: Reveal } | { kind: "play" };

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const [load, setLoad] = useState<Load>(isNew ? { kind: "play" } : { kind: "checking" });
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("split");
  const configured = contractConfigured();
  const [hasEth, setHasEth] = useState(false);
  useEffect(() => setHasEth(hasWallet()), []);

  // A finalized run is public data: anyone can replay it without a wallet.
  useEffect(() => {
    if (isNew || !configured) return;
    let live = true;
    fetchRevealed(id)
      .then((r) => live && setLoad(r ? { kind: "public", reveal: r } : { kind: "play" }))
      .catch(() => live && setLoad({ kind: "play" }));
    return () => {
      live = false;
    };
  }, [id, isNew, configured]);

  const connect = async () => {
    setError(null);
    try {
      setWallet(await connectWallet());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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

  const driver = useMemo(() => (wallet && wallet.chainId === SEPOLIA_CHAIN_ID ? new ChainDriver(wallet, isNew ? undefined : id) : null), [wallet, id, isNew]);

  // Once a new run has an id, make the URL shareable and reload-safe.
  useEffect(() => {
    if (!isNew || !driver) return;
    const t = setInterval(() => {
      if (driver.runId) {
        window.history.replaceState(null, "", `/run/${driver.runId}`);
        clearInterval(t);
      }
    }, 500);
    return () => clearInterval(t);
  }, [isNew, driver]);

  if (!configured) {
    return (
      <Shell>
        <p>The Whiteout contract address is not configured for this build, so real runs are unavailable.</p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <Link href="/practice" className="btn">Practice run</Link>
          <Link href="/" className="btn alt">Back to start</Link>
        </div>
      </Shell>
    );
  }

  if (load.kind === "checking") {
    return (
      <Shell>
        <p className="pulse">Reading run No. {id} from Sepolia...</p>
      </Shell>
    );
  }

  if (load.kind === "public") {
    return (
      <div className="root">
        <div className="snow snowA" style={{ opacity: 0.55 }} />
        <Header runId={id} finalized view={view} onView={setView} />
        <RevealScreen reveal={load.reveal} runId={id} practice={false} trailLive={[]} view={view} txs={[]} />
      </div>
    );
  }

  if (!wallet) {
    return (
      <Shell>
        <p>Connect the wallet that owns this run to keep playing.</p>
        {!hasEth && <p className="sub">No browser wallet found. Install one to play on Sepolia.</p>}
        {error && <p className="sub" role="alert" style={{ color: "#f0806f" }}>{error}</p>}
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={!hasEth} onClick={() => void connect()}>Connect wallet</button>
          <Link href="/" className="btn alt">Back to start</Link>
        </div>
      </Shell>
    );
  }

  if (!driver) {
    return (
      <Shell>
        <p role="alert">Switch to Sepolia to play.</p>
        {error && <p className="sub" style={{ color: "#f0806f" }}>{error}</p>}
        <button type="button" className="btn" onClick={() => void switchNet()}>Switch network</button>
      </Shell>
    );
  }

  return <GameScreen driver={driver} address={wallet.address} resume={!isNew} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="root">
      <div className="snow snowA" />
      <Header />
      <main style={{ position: "relative", zIndex: 10, padding: "16px 40px 40px", maxWidth: 640 }}>
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          <div className="h2">Run</div>
          {children}
        </div>
      </main>
    </div>
  );
}
