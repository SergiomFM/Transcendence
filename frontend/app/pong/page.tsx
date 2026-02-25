"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { GameMenu, GameScreen, GameMode } from "@/components/game";

export default function PongPage() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const prevRoomParam = useRef(roomParam);
  const [gameMode, setGameMode] = useState<GameMode>(() =>
    roomParam ? "multiplayer" : "menu"
  );
  const [initialRoomId, setInitialRoomId] = useState<string | null>(
    () => roomParam
  );

  // React to search param changes (e.g. clicking an invite while already on /pong)
  useEffect(() => {
    if (roomParam && roomParam !== prevRoomParam.current) {
      setGameMode("multiplayer");
      setInitialRoomId(roomParam);
    }
    prevRoomParam.current = roomParam;
  }, [roomParam]);

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
