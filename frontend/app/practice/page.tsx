"use client";

import { useMemo } from "react";
import { GameScreen } from "@/components/GameScreen";
import { PracticeDriver } from "@/lib/driver";

export default function PracticePage() {
  const driver = useMemo(() => new PracticeDriver(), []);
  return <GameScreen driver={driver} />;
}
