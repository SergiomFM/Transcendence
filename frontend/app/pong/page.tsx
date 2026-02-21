"use client";

import { useState, useEffect } from "react";
import { GameMenu, GameScreen, GameMode } from "@/components/game";

export default function PongPage() {
  const [gameMode, setGameMode] = useState<GameMode>("menu");

  useEffect(() => {
    const handleReset = () => setGameMode("menu");
    window.addEventListener("pong:back-to-menu", handleReset);
    return () => window.removeEventListener("pong:back-to-menu", handleReset);
  }, []);

  if (gameMode === "menu") {
    return <GameMenu onSelectMode={setGameMode} />;
  }

  return <GameScreen gameMode={gameMode} onBackToMenu={() => setGameMode("menu")} />;
}
