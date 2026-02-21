"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { GameMenu, GameScreen, GameMode } from "@/components/game";

export default function PongPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("t") ?? "";
  return <PongContent key={key} />;
}

function PongContent() {
  const [gameMode, setGameMode] = useState<GameMode>("menu");

  if (gameMode === "menu") {
    return <GameMenu onSelectMode={setGameMode} />;
  }

  return <GameScreen gameMode={gameMode} onBackToMenu={() => setGameMode("menu")} />;
}
