"use client";

import { useState } from "react";
import { GameScreen } from "@/components/GameScreen";
import { SimChainDriver } from "@/lib/sim";

/** Preview of the chain-mode screens without a wallet. Add ?fail=4 to fail every 4th step, ?slow=1 for 2.5 s steps. */
export default function DemoPage() {
  const [driver] = useState(() => {
    const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    return new SimChainDriver({ latency: q.get("slow") ? 2500 : 900, failEvery: Number(q.get("fail") ?? 0) });
  });
  return <GameScreen driver={driver} />;
}
