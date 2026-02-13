"use client";

import { useState, Suspense, lazy, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Maximize, Minimize } from "lucide-react";
import { GAME_WS_URL, GAME_HTTP_URL } from "@/lib/backend/config";
import { GameMode } from "./types";

const Pong = lazy(() => import("@/components/Pong"));

interface GameScreenProps {
  gameMode: GameMode;
  onBackToMenu: () => void;
}

export function GameScreen({ gameMode, onBackToMenu }: GameScreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await gameContainerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Error attempting to enable fullscreen:", err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Error attempting to exit fullscreen:", err);
      }
    }
  };

  const handleBackToMenu = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error("Error exiting fullscreen:", err);
      }
    }
    onBackToMenu();
  };

  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={gameContainerRef}
      className={cn(
        "w-full h-screen flex flex-col overflow-hidden bg-black",
        isFullscreen && "relative"
      )}
    >
      {!isFullscreen && (
        <div className="p-4 flex-shrink-0 flex justify-start items-center">
          <Button onClick={handleBackToMenu} variant="outline" size="sm">
            ← Back to Menu
          </Button>
        </div>
      )}

      <div
        className={cn(
          "flex-1 flex justify-center items-center overflow-hidden",
          isFullscreen ? "p-0" : "p-4"
        )}
      >
        <div
          className={cn(
            "relative",
            isFullscreen
              ? "w-full h-full"
              : "w-auto max-w-[95vw] max-h-[80vh] border-2 border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          )}
          style={{
            aspectRatio: "854/480",
            ...(isFullscreen
              ? {}
              : {
                  width: "min(95vw, calc(80vh * 854 / 480))",
                })
          }}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full h-full text-xl text-white">
                Loading game...
              </div>
            }
          >
            <Pong
              className="w-full h-full"
              online={gameMode === "online"}
              serverUrl={GAME_WS_URL}
              gameServerUrl={GAME_HTTP_URL}
            />
          </Suspense>

          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {!isFullscreen && (
        <div className="text-center p-4 flex-shrink-0">
          <p className="text-sm text-gray-400">
            {gameMode === "online"
              ? "🌐 Online Multiplayer Mode"
              : "🎮 Local Single Player Mode"}
          </p>
        </div>
      )}
    </div>
  );
}
