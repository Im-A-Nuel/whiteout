"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="root">
      <div className="snow snowA" />
      <main style={{ position: "relative", zIndex: 10, padding: "64px 24px", display: "flex", justifyContent: "center" }}>
        <div className="panel" role="alert" style={{ width: "min(100%, 560px)" }}>
          <div className="h2" style={{ fontSize: 30 }}>The lantern flickered</div>
          <p className="sub" style={{ fontSize: 16, marginTop: 8 }}>Something broke while drawing this screen. Your run on the chain is not affected.</p>
          <p className="hash" style={{ marginTop: 6, overflowWrap: "anywhere" }}>{error.message}</p>
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={reset}>Try again</button>
        </div>
      </main>
    </div>
  );
}
