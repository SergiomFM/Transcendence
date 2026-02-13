"use client";

import { Button } from "@/components/ui/button";
import { GameMode } from "./types";

interface GameMenuProps {
  onSelectMode: (mode: GameMode) => void;
}

export function GameMenu({ onSelectMode }: GameMenuProps) {
  return (
    <div className="w-full h-[80dvh] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-10">
        <h1 className="text-4xl font-bold mb-8">Select Game Mode</h1>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <Button
            size="lg"
            onClick={() => onSelectMode("local")}
            className="text-lg py-6"
          >
            🎮 Single Player
          </Button>

          <Button
            size="lg"
            onClick={() => onSelectMode("online")}
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
