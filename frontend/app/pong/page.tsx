"use client";

import { useState, Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";

const Pong = lazy(() => import("@/components/Pong"));

const PongPage = () => {
  const [gameMode, setGameMode] = useState<"menu" | "local" | "online">("menu");

  // Menu screen
  if (gameMode === "menu") {
    return (
      <div className="w-full h-screen flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-10">
          <h1 className="text-4xl font-bold mb-8">Select Game Mode</h1>

          <div className="flex flex-col gap-4 w-full max-w-md">
            <Button
              size="lg"
              onClick={() => setGameMode("local")}
              className="text-lg py-6"
            >
              🎮 Single Player
            </Button>

            <Button
              size="lg"
              onClick={() => setGameMode("online")}
              className="text-lg py-6"
              variant="secondary"
            >
              🌐 Multiplayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Back button */}
      <div className="p-4 flex-shrink-0">
        <Button onClick={() => setGameMode("menu")} variant="outline" size="sm">
          ← Back to Menu
        </Button>
      </div>

      <div className="flex-1 flex justify-center items-center p-10 overflow-hidden">
        <div className="aspect-[854/480] h-full max-h-full border-3 border-green-500 rounded-lg overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full h-full text-xl">
                Loading game...
              </div>
            }
          >
            <Pong
              className="size-full"
              online={gameMode === "online"}
              serverUrl="ws://localhost:3002/pong"
              gameServerUrl="http://localhost:3002"
            />
          </Suspense>
        </div>
      </div>

      {/* Mode indicator */}
      <div className="text-center p-4 flex-shrink-0">
        <p className="text-sm text-gray-600">
          {gameMode === "online"
            ? "🌐 Online Multiplayer Mode"
            : "🎮 Local Single Player Mode"}
        </p>
      </div>
    </div>
  );
};

export default PongPage;
