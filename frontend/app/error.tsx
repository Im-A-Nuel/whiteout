"use client";

import { FlickerLantern } from "@/components/Art";
import { PageShell } from "@/components/PageShell";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageShell>
      <div className="panel center-panel" role="alert">
        <FlickerLantern />
        <div className="h2" style={{ fontSize: 30 }}>The lantern flickered</div>
        <p className="sub" style={{ fontSize: 16 }}>Something broke while drawing this screen. A run already on the chain is not affected.</p>
        <p className="hash" style={{ overflowWrap: "anywhere" }}>{error.message}</p>
        <button type="button" className="btn" onClick={reset}>Try again</button>
      </div>
    </PageShell>
  );
}
