"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { startPong } from "./main";
import type { PongTranslations } from "./pongUI";
import type { Pong as PongInstance } from "./pong";
import TouchControls from "./TouchControls";

interface PongProps {
  className?: string;
  online?: boolean;
  serverUrl?: string;
  gameServerUrl?: string;
  roomId?: string;
  onSessionReplaced?: () => void;
  isFullscreen?: boolean;
}

const Pong = ({
  className,
  online = false,
  serverUrl,
  gameServerUrl,
  roomId,
  onSessionReplaced,
  isFullscreen = false,
}: PongProps) => {
  const t = useTranslations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pongInstance, setPongInstance] = useState<PongInstance | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device
  useEffect(() => {
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const handlePongReady = useCallback((pong: PongInstance) => {
    setPongInstance(pong);
  }, []);

  const pongTranslations = useMemo<PongTranslations>(() => ({
    welcomeWarlock: t("pong.welcomeWarlock"),
    pressSpaceReady: t("pong.pressSpaceReady"),
    youWon: t("pong.youWon"),
    player1Wins: t("pong.player1Wins"),
    youLost: t("pong.youLost"),
    player2Wins: t("pong.player2Wins"),
    matchWon: t("pong.matchWon"),
    matchLost: t("pong.matchLost"),
    waitingForOpponent: t("pong.waitingForOpponent"),
    getReady: t("pong.getReady"),
    fight: t("pong.fight"),
    opponentDisconnected: t("pong.opponentDisconnected"),
    disconnectedFromServer: t("pong.disconnectedFromServer"),
    opponentConnected: t("pong.opponentConnected"),
    waitingForOpponentReady: t("pong.waitingForOpponentReady"),
    spectating: t("pong.spectating"),
    pressClaimSeat: t("pong.pressClaimSeat"),
    otherPlayerReady: t("pong.otherPlayerReady"),
    labelYou: t("pong.labelYou"),
    labelOpponent: t("pong.labelOpponent"),
  }), [t]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    canvas.width = 854;
    canvas.height = 480;

    let cleanup: (() => void) | undefined;

    startPong(canvas, {
      online,
      serverUrl,
      gameServerUrl,
      roomId,
      onSessionReplaced,
      translations: pongTranslations,
      onPongReady: handlePongReady,
    }).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      setPongInstance(null);
      if (cleanup) cleanup();
    };
  }, [online, serverUrl, gameServerUrl, roomId, onSessionReplaced, pongTranslations, handlePongReady]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="h-full w-auto max-w-full max-h-full relative"
          style={{ aspectRatio: "16 / 9" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%" }}
            className="block"
            onContextMenu={(e) => e.preventDefault()}
          />
          {isTouchDevice && isFullscreen && <TouchControls pong={pongInstance} />}
        </div>
      </div>
    </div>
  );
};

export default Pong;
