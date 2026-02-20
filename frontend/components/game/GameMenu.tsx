"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GameMode } from "./types";

interface GameMenuProps {
  onSelectMode: (mode: GameMode) => void;
}

export function GameMenu({ onSelectMode }: GameMenuProps) {
  const t = useTranslations();

  return (
    <div className="w-full h-[80dvh] flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-10">
        <h1 className="text-4xl font-bold mb-8">{t("game.selectMode")}</h1>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <Button
            size="lg"
            onClick={() => onSelectMode("local")}
            className="text-lg py-6"
          >
            {t("game.singlePlayer")}
          </Button>

          <Button
            size="lg"
            onClick={() => onSelectMode("multiplayer")}
            className="text-lg py-6"
            variant="secondary"
          >
            {t("game.multiplayer")}
          </Button>
        </div>
      </div>
    </div>
  );
}
