"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Podium, type PodiumEntry } from "@/components/Art";
import { PageShell } from "@/components/PageShell";
import { Pilgrim, PipRow, shortAddr } from "@/components/Pixel";
import { contractConfigured, fetchFinalized } from "@/lib/chain";
import { bestOf, markMine } from "@/lib/leaderboard";

type Row = Awaited<ReturnType<typeof fetchFinalized>>[number];
type State = { kind: "loading" } | { kind: "ready"; rows: Row[] } | { kind: "error"; message: string } | { kind: "unconfigured" };

export default function LeaderboardPage() {
  const [state, setState] = useState<State>(contractConfigured() ? { kind: "loading" } : { kind: "unconfigured" });
  const [tries, setTries] = useState(0);
  const [me, setMe] = useState<string | null>(null);

  // read the connected account without prompting, so rows that belong to you can be highlighted
  useEffect(() => {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth) return;
    eth
      .request({ method: "eth_accounts" })
      .then((a) => setMe(Array.isArray(a) && a[0] ? String(a[0]) : null))
      .catch(() => setMe(null));
  }, []);

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

  const rows = state.kind === "ready" ? state.rows : [];
  const podium: PodiumEntry[] = rows.slice(0, 3).map((r, i) => ({ rank: (i + 1) as 1 | 2 | 3, label: shortAddr(r.player), score: r.score }));
  const best = state.kind === "ready" ? bestOf(state.rows, me) : null;

  return (
    <PageShell wide>
      <div className="panel lb">
        <div className="h2" style={{ fontSize: 28 }}>Leaderboard</div>
        <div className="sub">Finalized runs, best first. Built from RunFinalized events on Sepolia.</div>

        <div className="lb-hero">
          <Pilgrim variant="down" bob still scale={6} style={{ position: "relative" }} />
          <Podium entries={podium} />
          <div className="lb-msg">
            {state.kind === "loading" && <p className="pulse">Reading finalized runs...</p>}
            {state.kind === "unconfigured" && (
              <>
                <p>No contract is connected to this build, so there are no runs to show yet.</p>
                <Link href="/practice" className="btn sm">Try a practice run</Link>
              </>
            )}
            {state.kind === "error" && (
              <div className="errbox" role="alert" style={{ marginTop: 0 }}>
                <div>Could not read the leaderboard.</div>
                <div className="sub">{state.message}</div>
                <button type="button" className="btn sm" onClick={() => setTries((n) => n + 1)}>Retry</button>
              </div>
            )}
            {state.kind === "ready" && rows.length === 0 && (
              <>
                <p>No run has been finalized yet. The first relics home take the gold step.</p>
                <Link href="/" className="btn sm">Play the first run</Link>
              </>
            )}
            {state.kind === "ready" && rows.length > 0 && (
              <p>
                {rows.length} finalized {rows.length === 1 ? "run" : "runs"}.{" "}
                {best && <span style={{ color: "var(--amber)" }}>Your best: {best.score} relics in {best.steps} steps (run {best.runId}).</span>}
              </p>
            )}
          </div>
        </div>

        {state.kind === "ready" && rows.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: 18 }}>
            <table className="table">
              <thead>
                <tr><th>Rank</th><th>Wallet</th><th>Score</th><th>Steps</th><th>Replay</th></tr>
              </thead>
              <tbody>
                {markMine(rows, me).map((r, i) => (
                  <tr key={r.runId} className={r.mine ? "mine" : undefined}>
                    <td className="amber" style={{ fontWeight: 700 }}>{i + 1}</td>
                    <td className="hash">{shortAddr(r.player)}{r.mine && <span className="you-tag">You</span>}</td>
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
    </PageShell>
  );
}
