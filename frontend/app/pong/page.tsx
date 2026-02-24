"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GameMenu, GameScreen, GameMode } from "@/components/game";

export default function PongPage() {
  const searchParams = useSearchParams();
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [initialRoomId, setInitialRoomId] = useState<string | null>(null);

  // Read ?room= query param on mount to auto-join a room from an invite
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam) {
      setInitialRoomId(roomParam);
      setGameMode("multiplayer");
    }
  }, [searchParams]);

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
