import Link from "next/link";
import { StormScene } from "@/components/Art";
import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="panel center-panel">
        <StormScene />
        <div className="h2" style={{ fontSize: 34 }}>Lost in the storm</div>
        <p className="sub" style={{ fontSize: 16 }}>There is no page at this address. The snow covered the path.</p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" className="btn">Back to the gate</Link>
          <Link href="/practice" className="btn alt">Practice run</Link>
        </div>
      </div>
    </PageShell>
  );
}
