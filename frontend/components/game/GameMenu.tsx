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
    <div className="w-full min-h-[80dvh] flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-center gap-6 sm:gap-8 p-4 sm:p-10 animate-fade-up">
        <h1 className="text-3xl sm:text-5xl text-primary text-glow-strong tracking-wide mb-2 sm:mb-4 text-center">{t("game.selectMode")}</h1>

        <div className="flex flex-col gap-4 w-full max-w-md">
          <Button
            size="lg"
            onClick={() => onSelectMode("local")}
            className="text-lg py-6 animate-pulse-glow"
          >
            {t("game.singlePlayer")}
          </Button>

          <Button
            size="lg"
            onClick={() => onSelectMode("multiplayer")}
            className="text-lg py-6 border-neon-muted/40 hover:border-glow transition-all"
            variant="secondary"
          >
            {t("game.multiplayer")}
          </Button>
        </div>

        {/* Game Instructions */}
        <div className="w-full max-w-4xl mt-8 space-y-8">
          <h2 className="text-2xl sm:text-3xl text-center text-glow tracking-wide">
            {t("game.instructionsTitle")}
          </h2>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Controls */}
            <div className="rounded-xl border border-neon-muted/30 bg-card/50 backdrop-blur-sm p-5 space-y-3 hover:border-glow transition-all">
              <h3 className="text-lg font-semibold text-foreground/90">
                {t("game.controlsP1")}
              </h3>
              <div className="space-y-1.5">
                <ControlRow keys="W / A" action={t("game.ctrlMoveLeft")} />
                <ControlRow keys="S / D" action={t("game.ctrlMoveRight")} />
                <ControlRow keys="Q" action={t("game.ctrlDefense")} />
                <ControlRow keys="E" action={t("game.ctrlAttack")} />
                <ControlRow keys="Space" action={t("game.ctrlReady")} />
                <ControlRow keys="C" action={t("game.ctrlCamera")} />
              </div>
            </div>

            {/* Player 2 Controls */}
            <div className="rounded-xl border border-neon-muted/30 bg-card/50 backdrop-blur-sm p-5 space-y-3 hover:border-glow transition-all">
              <h3 className="text-lg font-semibold text-foreground/90">
                {t("game.controlsP2")}
              </h3>
              <div className="space-y-1.5">
                <ControlRow keys="↑ / ←" action={t("game.ctrlMoveLeft")} />
                <ControlRow keys="↓ / →" action={t("game.ctrlMoveRight")} />
                <ControlRow keys="K" action={t("game.ctrlDefense")} />
                <ControlRow keys="L" action={t("game.ctrlAttack")} />
              </div>
              <p className="text-xs text-muted-foreground pt-1 italic">
                {t("game.controlsP2Hint")}
              </p>
            </div>
          </div>

          {/* Spells */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center">
              {t("game.spellsTitle")}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto">
              {t("game.spellsDesc")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Defensive Spells */}
              <div className="rounded-xl border border-neon-muted/30 bg-card/50 backdrop-blur-sm p-5 space-y-3 hover:border-glow transition-all">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_theme(colors.cyan.500/50%)]" />
                  <h4 className="text-base font-semibold">
                    {t("game.defensiveSpells")}
                  </h4>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    Q / K
                  </span>
                </div>
                <div className="space-y-2.5">
                  <SpellRow
                    color="bg-cyan-500"
                    name={t("game.spellStop")}
                    desc={t("game.spellStopDesc")}
                  />
                  <SpellRow
                    color="bg-yellow-500"
                    name={t("game.spellBack")}
                    desc={t("game.spellBackDesc")}
                  />
                  <SpellRow
                    color="bg-fuchsia-500"
                    name={t("game.spellMagnet")}
                    desc={t("game.spellMagnetDesc")}
                  />
                </div>
              </div>

              {/* Offensive Spells */}
              <div className="rounded-xl border border-neon-muted/30 bg-card/50 backdrop-blur-sm p-5 space-y-3 hover:border-glow transition-all">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_theme(colors.red.500/50%)]" />
                  <h4 className="text-base font-semibold">
                    {t("game.offensiveSpells")}
                  </h4>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    E / L
                  </span>
                </div>
                <div className="space-y-2.5">
                  <SpellRow
                    color="bg-blue-500"
                    name={t("game.spellAngleSwitch")}
                    desc={t("game.spellAngleSwitchDesc")}
                  />
                  <SpellRow
                    color="bg-green-500"
                    name={t("game.spellShot")}
                    desc={t("game.spellShotDesc")}
                  />
                  <SpellRow
                    color="bg-red-500"
                    name={t("game.spellPortal")}
                    desc={t("game.spellPortalDesc")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-neon-muted/30 bg-card/50 backdrop-blur-sm p-5 space-y-2 hover:border-glow transition-all">
            <h4 className="text-base font-semibold">{t("game.tipsTitle")}</h4>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>{t("game.tip1")}</li>
              <li>{t("game.tip2")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 shrink-0">
        {keys.split(" / ").map((key) => (
          <kbd
            key={key}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-neon-muted/40 bg-muted/60 px-1.5 text-xs font-mono font-medium text-neon"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">{action}</span>
    </div>
  );
}

function SpellRow({
  color,
  name,
  desc,
}: {
  color: string;
  name: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`mt-1.5 inline-block w-2 h-2 rounded-full shrink-0 ${color}`}
      />
      <div>
        <span className="text-sm font-medium text-foreground/90">{name}</span>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
    </div>
  );
}
