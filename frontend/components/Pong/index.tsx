"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { startPong } from "./main";
import type { PongTranslations } from "./pongUI";
import type { Pong as PongInstance } from "./pong";
import type { ChatMessage, RoomUser } from "@/components/game/types";
import TouchControls from "./TouchControls";
import { useInputMethod } from "@/lib/useInputMethod";

interface PongProps {
  className?: string;
  online?: boolean;
  serverUrl?: string;
  gameServerUrl?: string;
  roomId?: string;
  onSessionReplaced?: () => void;
  isFullscreen?: boolean;
  onChatMessage?: (message: ChatMessage) => void;
  onSocketReady?: (send: (content: string) => void) => void;
  onRoomUsers?: (users: RoomUser[]) => void;
}

const Pong = ({
  className,
  online = false,
  serverUrl,
  gameServerUrl,
  roomId,
  onSessionReplaced,
  isFullscreen = false,
  onChatMessage,
  onSocketReady,
  onRoomUsers,
}: PongProps) => {
  const t = useTranslations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameWrapperRef = useRef<HTMLDivElement>(null);
  const pongInstanceRef = useRef<PongInstance | null>(null);
  const [pongInstance, setPongInstance] = useState<PongInstance | null>(null);
  
  // Detect active input method (keyboard, gamepad, or touch)
  const inputMethod = useInputMethod(isFullscreen);

  // Maintain 16:9 aspect ratio and scale canvas within parent container
  useEffect(() => {
    const wrapper = gameWrapperRef.current;
    if (!wrapper) return;
    const parent = wrapper.parentElement;
    if (!parent) return;

    const BASE_W = 854;
    const BASE_H = 480;

    const fitToParent = () => {
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      const targetRatio = BASE_W / BASE_H;
      const parentRatio = pw / ph;

      let scale: number;
      if (parentRatio > targetRatio) {
        // Parent is wider — height-limited (pillarbox)
        scale = ph / BASE_H;
      } else {
        // Parent is taller — width-limited (letterbox)
        scale = pw / BASE_W;
      }

      wrapper.style.width = BASE_W + "px";
      wrapper.style.height = BASE_H + "px";
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = "center center";
    };

    fitToParent();
    const ro = new ResizeObserver(fitToParent);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const handlePongReady = useCallback((pong: PongInstance) => {
    pongInstanceRef.current = pong;
    setPongInstance(pong);
    // Auto-focus canvas so keyboard input works immediately
    canvasRef.current?.focus();
  }, []);

  // Update UI text based on active input method
  useEffect(() => {
    if (!pongInstance?.GUI) return;
    pongInstance.GUI.setInputMode(inputMethod);
  }, [pongInstance, inputMethod]);

  // Wire chat message callback from pong engine to React
  useEffect(() => {
    const pong = pongInstanceRef.current;
    if (!pong) return;
    pong.onChatMessage = onChatMessage;
    return () => {
      pong.onChatMessage = undefined;
    };
  }, [pongInstance, onChatMessage]);

  // Wire room users callback from pong engine to React
  useEffect(() => {
    const pong = pongInstanceRef.current;
    if (!pong) return;
    pong.onRoomUsers = onRoomUsers;
    return () => {
      pong.onRoomUsers = undefined;
    };
  }, [pongInstance, onRoomUsers]);

  // Expose send function that lazily uses the pong socket
  useEffect(() => {
    if (!pongInstance || !onSocketReady) return;
    const send = (content: string) => {
      const socket = pongInstance.socket;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "CHAT_MESSAGE", content }));
      }
    };
    onSocketReady(send);
  }, [pongInstance, onSocketReady]);

  // Re-focus canvas when clicking anywhere on the game area
  const handleGameAreaClick = useCallback(() => {
    canvasRef.current?.focus();
  }, []);

  const pongTranslations = useMemo<PongTranslations>(() => ({
    welcomeWarlock: t("pong.welcomeWarlock"),
    pressSpaceReady: t("pong.pressSpaceReady"),
    pressAReady: t("pong.pressAReady"),
    pressReadyTouch: t("pong.pressReadyTouch"),
    pressPlayClaimSeat: t("pong.pressPlayClaimSeat"),
    pressClaimSeat: t("pong.pressClaimSeat"),
    pressBClaimSeat: t("pong.pressBClaimSeat"),
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
    <div className={cn("relative w-full h-full", className)} onClick={handleGameAreaClick}>
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div
          ref={gameWrapperRef}
          className="relative"
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas
            ref={canvasRef}
            tabIndex={0}
            className="block outline-none"
            style={{ width: "854px", height: "480px", imageRendering: "pixelated" }}
            onContextMenu={(e) => e.preventDefault()}
          />
          {inputMethod === "touch" && <TouchControls pong={pongInstance} />}
        </div>
      </div>
    </div>
  );
};

export default Pong;
