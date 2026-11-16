import Link from "next/link";

export default function NotFound() {
  return (
    <div className="root">
      <div className="snow snowA" />
      <main style={{ position: "relative", zIndex: 10, padding: "64px 24px", display: "flex", justifyContent: "center" }}>
        <div className="panel" style={{ width: "min(100%, 560px)" }}>
          <div className="h2" style={{ fontSize: 34 }}>Lost in the storm</div>
          <p className="sub" style={{ fontSize: 16, marginTop: 8 }}>There is no page at this address. The snow covered the path.</p>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            <Link href="/" className="btn">Back to the gate</Link>
            <Link href="/practice" className="btn alt">Practice run</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
