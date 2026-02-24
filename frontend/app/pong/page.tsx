"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GameMenu, GameScreen, GameMode } from "@/components/game";

export default function PongPage() {
  const searchParams = useSearchParams();
  const roomParam = useMemo(() => searchParams.get("room"), [searchParams]);
  const [gameMode, setGameMode] = useState<GameMode>(() =>
    roomParam ? "multiplayer" : "menu"
  );
  const [initialRoomId, setInitialRoomId] = useState<string | null>(
    () => roomParam
  );

  useEffect(() => {
    const handleReset = () => {
      setGameMode("menu");
      setInitialRoomId(null);
    };
    window.addEventListener("pong:back-to-menu", handleReset);
    return () => window.removeEventListener("pong:back-to-menu", handleReset);
  }, []);

  if (gameMode === "menu") {
    return <GameMenu onSelectMode={setGameMode} />;
  }

  return (
    <GameScreen
      gameMode={gameMode}
      onBackToMenu={() => {
        setGameMode("menu");
        setInitialRoomId(null);
      }}
      initialRoomId={initialRoomId}
    />
  );
}
