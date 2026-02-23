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

            {/* Gamepad Controls */}
            <div className="md:col-span-2 rounded-xl border border-neon-muted/30 bg-card/50 backdrop-blur-sm p-5 space-y-3 hover:border-glow transition-all">
              <h3 className="text-lg font-semibold text-foreground/90 text-center">
                {t("game.controlsGamepad")}
              </h3>
              <GamepadDiagram
                move={t("game.ctrlGamepadMove")}
                defense={t("game.ctrlGamepadDefense")}
                attack={t("game.ctrlGamepadAttack")}
                ready={t("game.ctrlGamepadReady")}
                action={t("game.ctrlGamepadAction")}
              />
              <p className="text-xs text-muted-foreground pt-1 italic text-center">
                {t("game.controlsGamepadHint")}
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
                    Q / K / LT
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
                    E / L / RT
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

/* ─── Pixel-art Xbox Gamepad SVG Diagram ─────────────────────────────────────── */

function GamepadDiagram({
  move,
  defense,
  attack,
  ready,
  action,
}: {
  move: string;
  defense: string;
  attack: string;
  ready: string;
  action: string;
}) {
  const body = "var(--neon-muted)";
  const accent = "var(--neon)";
  const dim = "var(--muted-foreground)";
  const bg = "var(--card)";
  const bodyFill = "var(--card)"; // Background color for body

  /*
   * True low-res pixel art (32x16 grid), scaled 10x
   * S=10
   */
  const s = 10;
  const ox = 220;
  const oy = 30;

  return (
    <svg
      viewBox="0 0 760 220"
      className="w-full max-w-2xl mx-auto"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Gamepad controls diagram"
    >
      <g transform={`translate(${ox}, ${oy}) scale(${s})`}>
        {/* ================================================================ */}
        {/* LOW-RES CONTROLLER ART (32x16)                                   */}
        {/* ================================================================ */}

        {/* ── Body Silhouette ── */}
        {/* Main block */}
        <rect x="4" y="4" width="24" height="8" fill={bodyFill} stroke={body} strokeWidth="0.15" />
        {/* Left Grip */}
        <rect x="3" y="11" width="4" height="4" fill={bodyFill} stroke={body} strokeWidth="0.15" />
        {/* Right Grip */}
        <rect x="25" y="11" width="4" height="4" fill={bodyFill} stroke={body} strokeWidth="0.15" />
        {/* Top Bumpers (LB/RB) */}
        <rect x="4" y="2" width="6" height="2" fill={bodyFill} stroke={body} strokeWidth="0.15" />
        <rect x="22" y="2" width="6" height="2" fill={bodyFill} stroke={body} strokeWidth="0.15" />

        {/* ── Triggers (LT/RT) - FILLED for clarity ── */}
        <rect x="5" y="0" width="4" height="2" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="0.15" />
        <rect x="23" y="0" width="4" height="2" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="0.15" />

        {/* ── Sticks ── */}
        {/* Left Stick (Move) - Highlighted */}
        <rect x="5" y="5" width="4" height="4" fill={accent} fillOpacity="0.1" stroke={accent} strokeWidth="0.15" />
        <rect x="6" y="6" width="2" height="2" fill={accent} />
        
        {/* Right Stick - Muted */}
        <rect x="19" y="9" width="4" height="4" fill={bodyFill} stroke={body} strokeWidth="0.15" />
        <rect x="20" y="10" width="2" height="2" fill={body} />

        {/* ── D-Pad (Move) - Highlighted ── */}
        <path d="M 10 9 h 1 v 3 h -1 z M 9 10 h 3 v 1 h -3 z" fill={accent} />

        {/* ── Face Buttons ── */}
        {/* Y (Top) */}
        <rect x="24" y="5" width="1" height="1" fill={body} opacity="0.7" /> 
        {/* X (Left) */}
        <rect x="22" y="7" width="1" height="1" fill={body} opacity="0.7" /> 
        {/* B (Right) - Action */}
        <rect x="26" y="7" width="1" height="1" fill={accent} /> 
        {/* A (Bottom) - Ready */}
        <rect x="24" y="9" width="1" height="1" fill={accent} /> 

        {/* ── Center Buttons ── */}
        <rect x="15" y="5" width="2" height="2" fill="none" stroke={body} strokeWidth="0.15" />
        <rect x="12" y="7" width="1" height="1" fill={body} opacity="0.7" />
        <rect x="19" y="7" width="1" height="1" fill={body} opacity="0.7" />
      </g>

      {/* ================================================================ */}
      {/* ANNOTATION LINES (High-res overlay)                               */}
      {/* ================================================================ */}

      {/* ── LT → Defense (Left top) ── */}
      <line x1="270" y1="40" x2="160" y2="40" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
      <rect x="156" y="38" width="4" height="4" fill={accent} />
      <text x="148" y="34" textAnchor="end" fontSize="13" fontFamily="monospace" fill={accent} fontWeight="bold">LT / L2</text>
      <text x="148" y="50" textAnchor="end" fontSize="12" fontFamily="monospace" fill={dim}>{defense}</text>

      {/* ── Left Stick + D-Pad → Move (Left bottom) ── */}
      <path d="M 270 120 L 220 120 L 220 160 L 160 160" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
      <path d="M 315 135 L 220 135" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
      <rect x="156" y="158" width="4" height="4" fill={accent} />
      <text x="148" y="154" textAnchor="end" fontSize="13" fontFamily="monospace" fill={accent} fontWeight="bold">Stick / D-Pad</text>
      <text x="148" y="170" textAnchor="end" fontSize="12" fontFamily="monospace" fill={dim}>{move}</text>

      {/* ── RT → Attack (Right top) ── */}
      <line x1="490" y1="40" x2="600" y2="40" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
      <rect x="600" y="38" width="4" height="4" fill={accent} />
      <text x="610" y="34" textAnchor="start" fontSize="13" fontFamily="monospace" fill={accent} fontWeight="bold">RT / R2</text>
      <text x="610" y="50" textAnchor="start" fontSize="12" fontFamily="monospace" fill={dim}>{attack}</text>

      {/* ── A → Ready (Right bottom) ── */}
      <line x1="465" y1="125" x2="600" y2="125" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
      <rect x="600" y="123" width="4" height="4" fill={accent} />
      <text x="610" y="120" textAnchor="start" fontSize="13" fontFamily="monospace" fill={accent} fontWeight="bold">A / Cross</text>
      <text x="610" y="136" textAnchor="start" fontSize="12" fontFamily="monospace" fill={dim}>{ready}</text>

      {/* ── B → Action (Right bottom below A) ── */}
      <path d="M 485 105 L 530 105 L 530 160 L 600 160" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="4 2" />
      <rect x="600" y="158" width="4" height="4" fill={accent} />
      <text x="610" y="154" textAnchor="start" fontSize="13" fontFamily="monospace" fill={accent} fontWeight="bold">B / Circle</text>
      <text x="610" y="170" textAnchor="start" fontSize="12" fontFamily="monospace" fill={dim}>{action}</text>
    </svg>
  );
}
