"use client";

import { useState } from "react";
import { GameMenu, GameScreen, GameMode } from "@/components/game";

export default function PongPage() {
  const [gameMode, setGameMode] = useState<GameMode>("menu");

  if (gameMode === "menu") {
    return <GameMenu onSelectMode={setGameMode} />;
  }

  return <GameScreen gameMode={gameMode} onBackToMenu={() => setGameMode("menu")} />;
}
