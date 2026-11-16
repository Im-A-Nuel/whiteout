"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/components/GameScreen";
import { PipRow, shortAddr } from "@/components/Pixel";
import { contractConfigured, fetchFinalized } from "@/lib/chain";

type Row = Awaited<ReturnType<typeof fetchFinalized>>[number];
type State = { kind: "loading" } | { kind: "ready"; rows: Row[] } | { kind: "error"; message: string } | { kind: "unconfigured" };

export default function LeaderboardPage() {
  const [state, setState] = useState<State>(contractConfigured() ? { kind: "loading" } : { kind: "unconfigured" });
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!contractConfigured()) return;
    let live = true;
    setState({ kind: "loading" });
    fetchFinalized()
      .then((rows) => live && setState({ kind: "ready", rows }))
      .catch((e) => live && setState({ kind: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [tries]);

  return (
    <div className="root">
      <div className="snow snowA" />
      <Header />
      <main style={{ position: "relative", zIndex: 10, padding: "16px 40px 40px", display: "flex", justifyContent: "center" }}>
        <div className="panel" style={{ width: "min(100%, 860px)" }}>
          <div className="h2">Leaderboard</div>
          <div className="sub">Finalized runs, best first. Built from RunFinalized events on Sepolia.</div>

          {state.kind === "loading" && <p className="pulse">Reading finalized runs...</p>}
          {state.kind === "unconfigured" && <p>The contract address is not configured for this build, so there is nothing to read yet.</p>}
          {state.kind === "error" && (
            <div className="errbox" role="alert">
              <div>Could not read the leaderboard. {state.message}</div>
              <button type="button" className="btn sm" onClick={() => setTries((n) => n + 1)}>Retry</button>
            </div>
          )}
          {state.kind === "ready" && state.rows.length === 0 && (
            <p>No run has been finalized yet. <Link href="/" style={{ color: "var(--amber)" }}>Play the first one.</Link></p>
          )}
          {state.kind === "ready" && state.rows.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr><th>Rank</th><th>Wallet</th><th>Score</th><th>Steps</th><th>Replay</th></tr>
                </thead>
                <tbody>
                  {state.rows.map((r, i) => (
                    <tr key={r.runId}>
                      <td className="amber" style={{ fontWeight: 700 }}>{i + 1}</td>
                      <td className="hash">{shortAddr(r.player)}</td>
                      <td style={{ fontWeight: 700 }}>{r.score}</td>
                      <td>
                        <span className="sr-only">{r.steps} of 24</span>
                        <PipRow total={24} on={r.steps} label={`${r.steps} of 24 steps`} white cols={24} gap={2} />
                      </td>
                      <td><Link href={`/run/${r.runId}`} className="btn sm alt">Run {r.runId}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
