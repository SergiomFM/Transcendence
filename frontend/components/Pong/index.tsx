"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { startPong } from "./main";
import type { PongTranslations } from "./pongUI";

interface PongProps {
  className?: string;
  online?: boolean;
  serverUrl?: string;
  gameServerUrl?: string;
  roomId?: string;
  onSessionReplaced?: () => void;
}

const Pong = ({
  className,
  online = false,
  serverUrl,
  gameServerUrl,
  roomId,
  onSessionReplaced,
}: PongProps) => {
  const t = useTranslations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointers = useRef<Record<string, number | undefined>>({});
  const pressStartTimes = useRef<Record<string, number>>({});
  const releaseTimers = useRef<Record<string, number | undefined>>({});
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

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
    }).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [online, serverUrl, gameServerUrl, roomId, onSessionReplaced, pongTranslations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateControls = () => {
      const isFullscreen = !!document.fullscreenElement;
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      const isTouchDevice =
        window.matchMedia("(pointer: coarse)").matches ||
        navigator.maxTouchPoints > 0;
      setShowMobileControls(isFullscreen && isLandscape && isTouchDevice);
    };

    updateControls();
    window.addEventListener("fullscreenchange", updateControls);
    window.addEventListener("resize", updateControls);
    window.addEventListener("orientationchange", updateControls);
    return () => {
      window.removeEventListener("fullscreenchange", updateControls);
      window.removeEventListener("resize", updateControls);
      window.removeEventListener("orientationchange", updateControls);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!online) {
      setIsSpectator(false);
      setIsReady(false);
      setIsRunning(false);
    }
    const handleSpectator = (event: Event) => {
      const detail = (event as CustomEvent).detail as { isSpectator?: boolean };
      if (typeof detail?.isSpectator === "boolean") {
        setIsSpectator(detail.isSpectator);
      }
    };
    const handleReady = (event: Event) => {
      const detail = (event as CustomEvent).detail as { isReady?: boolean };
      if (typeof detail?.isReady === "boolean") {
        setIsReady(detail.isReady);
      }
    };
    const handleRunning = (event: Event) => {
      const detail = (event as CustomEvent).detail as { isRunning?: boolean };
      if (typeof detail?.isRunning === "boolean") {
        setIsRunning(detail.isRunning);
      }
    };
    window.addEventListener("pong:spectator", handleSpectator as EventListener);
    window.addEventListener("pong:ready", handleReady as EventListener);
    window.addEventListener("pong:running", handleRunning as EventListener);
    return () => {
      window.removeEventListener(
        "pong:spectator",
        handleSpectator as EventListener,
      );
      window.removeEventListener("pong:ready", handleReady as EventListener);
      window.removeEventListener("pong:running", handleRunning as EventListener);
    };
  }, [online]);

  const dispatchKey = useCallback((key: string, type: "keydown" | "keyup") => {
    if (typeof window === "undefined") return;
    const event = new KeyboardEvent(type, { key, bubbles: true });
    window.dispatchEvent(event);
    canvasRef.current?.dispatchEvent(event);
  }, []);

  const allowDirectionalInput = !online || isRunning;
  const allowSpellInput = !online || isRunning || !isSpectator;

  const triggerHaptic = (duration = 15) => {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  };

  const touchButtonStyle = {
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  } as const;

  const touchImageStyle = {
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
  } as const;

  const preventContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
  };

  const suppressTouchDefault = (event: ReactTouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const [pressedButtons, setPressedButtons] = useState<Record<string, boolean>>({});

  const setPressed = (key: string, pressed: boolean) => {
    setPressedButtons((prev) => ({ ...prev, [key]: pressed }));
  };

  const clearReleaseTimer = (key: string) => {
    const timerId = releaseTimers.current[key];
    if (timerId === undefined) return;
    window.clearTimeout(timerId);
    delete releaseTimers.current[key];
  };

  const scheduleRelease = (key: string) => {
    const isDirectional = key === "a" || key === "d";
    clearReleaseTimer(key);
    if (isDirectional) {
      setPressed(key, false);
      delete pressStartTimes.current[key];
      return;
    }

    const minPressMs = 90;
    const start = pressStartTimes.current[key];
    const elapsed = start ? Date.now() - start : minPressMs;
    const remaining = minPressMs - elapsed;
    if (remaining <= 0) {
      setPressed(key, false);
      delete pressStartTimes.current[key];
      return;
    }

    const timerId = window.setTimeout(() => {
      setPressed(key, false);
      delete releaseTimers.current[key];
    }, remaining);
    releaseTimers.current[key] = timerId;
    delete pressStartTimes.current[key];
  };

  const releasePointer = useCallback(
    (pointerId: number, triggerTap: boolean) => {
      for (const [key, activeId] of Object.entries(activePointers.current)) {
        if (activeId !== pointerId) continue;
        delete activePointers.current[key];
        scheduleRelease(key);
        if (key === "a" || key === "d") {
          dispatchKey(key, "keyup");
        } else if (triggerTap) {
          dispatchKey(key, "keydown");
          dispatchKey(key, "keyup");
        }
      }
    },
    [dispatchKey],
  );

  const resetAllPressed = useCallback(() => {
    const activeKeys = Object.keys(activePointers.current);
    if (activeKeys.length === 0) return;
    for (const key of activeKeys) {
      clearReleaseTimer(key);
      if (key === "a" || key === "d") {
        dispatchKey(key, "keyup");
      }
    }
    activePointers.current = {};
    pressStartTimes.current = {};
    setPressedButtons({});
  }, [dispatchKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePointerUp = (event: globalThis.PointerEvent) => {
      releasePointer(event.pointerId, true);
    };
    const handlePointerCancel = (event: globalThis.PointerEvent) => {
      releasePointer(event.pointerId, false);
    };
    const handleBlur = () => {
      resetAllPressed();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        resetAllPressed();
      }
    };
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      Object.keys(releaseTimers.current).forEach((key) => clearReleaseTimer(key));
    };
  }, [releasePointer, resetAllPressed]);

  useEffect(() => {
    if (!showMobileControls) return;
    const sources = [
      "/buttons/left.png",
      "/buttons/left_pressed.png",
      "/buttons/right.png",
      "/buttons/right_pressed.png",
      "/buttons/def.png",
      "/buttons/def_pressed.png",
      "/buttons/atk.png",
      "/buttons/atk_pressed.png",
      "/buttons/ready.png",
      "/buttons/ready_pressed.png",
      "/buttons/spectate.png",
      "/buttons/play.png",
    ];
    sources.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [showMobileControls]);

  const handleDirectionalPress = (key: string) =>
    (event: ReactPointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== undefined) return;
      activePointers.current[key] = pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      if (event.pointerType === "touch") triggerHaptic();
      clearReleaseTimer(key);
      pressStartTimes.current[key] = Date.now();
      setPressed(key, true);
      dispatchKey(key, "keydown");
    };

  const handleDirectionalRelease = (key: string) =>
    (event: ReactPointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== pointerId) return;
      delete activePointers.current[key];
      event.currentTarget.releasePointerCapture?.(pointerId);
      scheduleRelease(key);
      dispatchKey(key, "keyup");
    };

  const handleTapPress = (key: string) =>
    (event: ReactPointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== undefined) return;
      activePointers.current[key] = pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      if (event.pointerType === "touch") triggerHaptic();
      clearReleaseTimer(key);
      pressStartTimes.current[key] = Date.now();
      setPressed(key, true);
    };

  const handleTapRelease = (key: string) =>
    (event: ReactPointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== pointerId) return;
      delete activePointers.current[key];
      event.currentTarget.releasePointerCapture?.(pointerId);
      scheduleRelease(key);
      dispatchKey(key, "keydown");
      dispatchKey(key, "keyup");
    };

  const getButtonIdFromKey = (key: string) => {
    switch (key) {
      case "a":
        return "left";
      case "d":
        return "right";
      case "q":
        return "def";
      case "e":
        return "atk";
      case " ":
        return "ready";
      default:
        return key;
    }
  };

  const getButtonSrc = (key: string) => {
    const id = getButtonIdFromKey(key);
    return pressedButtons[key]
      ? `/buttons/${id}_pressed.png`
      : `/buttons/${id}.png`;
  };

  const getReadyButtonSrc = () => {
    const id = getButtonIdFromKey(" ");
    if (pressedButtons[" "]) {
      return `/buttons/${id}_pressed.png`;
    }
    return isReady ? `/buttons/${id}_pressed.png` : `/buttons/${id}.png`;
  };

  const getSpectateButtonSrc = () => {
    return isSpectator ? "/buttons/play.png" : "/buttons/spectate.png";
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="h-full w-auto max-w-full max-h-full"
          style={{ aspectRatio: "16 / 9", ...touchButtonStyle }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%" }}
            className="block"
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      {showMobileControls && (
        <div
          className="pointer-events-none absolute inset-0"
          style={touchButtonStyle}
        >
          <div className="pointer-events-auto touch-none absolute bottom-6 left-4 flex items-center gap-3">
            <div
              role="button"
              tabIndex={0}
              aria-label={t("game.ariaLeft")}
              className="h-20 w-20 touch-none select-none"
              style={touchButtonStyle}
              onContextMenu={preventContextMenu}
              onTouchStart={suppressTouchDefault}
              onTouchEnd={suppressTouchDefault}
              onTouchCancel={suppressTouchDefault}
              onPointerDown={
                allowDirectionalInput
                  ? handleDirectionalPress("a")
                  : undefined
              }
              onPointerUp={
                allowDirectionalInput
                  ? handleDirectionalRelease("a")
                  : undefined
              }
              onPointerLeave={
                allowDirectionalInput
                  ? handleDirectionalRelease("a")
                  : undefined
              }
              onPointerCancel={
                allowDirectionalInput
                  ? handleDirectionalRelease("a")
                  : undefined
              }
            >
              <img
                src={getButtonSrc("a")}
                alt={t("game.ariaLeft")}
                className="h-full w-full object-contain"
                style={touchImageStyle}
                draggable={false}
              />
            </div>
            <div
              role="button"
              tabIndex={0}
              aria-label={t("game.ariaRight")}
              className="h-20 w-20 touch-none select-none"
              style={touchButtonStyle}
              onContextMenu={preventContextMenu}
              onTouchStart={suppressTouchDefault}
              onTouchEnd={suppressTouchDefault}
              onTouchCancel={suppressTouchDefault}
              onPointerDown={
                allowDirectionalInput
                  ? handleDirectionalPress("d")
                  : undefined
              }
              onPointerUp={
                allowDirectionalInput
                  ? handleDirectionalRelease("d")
                  : undefined
              }
              onPointerLeave={
                allowDirectionalInput
                  ? handleDirectionalRelease("d")
                  : undefined
              }
              onPointerCancel={
                allowDirectionalInput
                  ? handleDirectionalRelease("d")
                  : undefined
              }
            >
              <img
                src={getButtonSrc("d")}
                alt={t("game.ariaRight")}
                className="h-full w-full object-contain"
                style={touchImageStyle}
                draggable={false}
              />
            </div>
          </div>

          <div className="pointer-events-auto touch-none absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
            <div
              role="button"
              tabIndex={0}
              aria-label={t("game.ariaReady")}
              className="touch-none select-none"
              style={touchButtonStyle}
              onPointerDown={handleTapPress(" ")}
              onPointerUp={handleTapRelease(" ")}
              onPointerLeave={handleTapRelease(" ")}
              onPointerCancel={handleTapRelease(" ")}
              onContextMenu={preventContextMenu}
              onTouchStart={suppressTouchDefault}
              onTouchEnd={suppressTouchDefault}
              onTouchCancel={suppressTouchDefault}
            >
              <img
                src={getReadyButtonSrc()}
                alt={t("game.ariaReady")}
                className="h-10 w-auto object-contain"
                style={touchImageStyle}
                draggable={false}
              />
            </div>
          </div>
          {online && (
            <div className="pointer-events-auto touch-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
              <div
                role="button"
                tabIndex={0}
                aria-label={isSpectator ? t("game.ariaPlay") : t("game.ariaSpectate")}
                className="touch-none select-none"
                style={touchButtonStyle}
                onPointerDown={handleTapPress("c")}
                onPointerUp={handleTapRelease("c")}
                onPointerLeave={handleTapRelease("c")}
                onPointerCancel={handleTapRelease("c")}
                onContextMenu={preventContextMenu}
                onTouchStart={suppressTouchDefault}
                onTouchEnd={suppressTouchDefault}
                onTouchCancel={suppressTouchDefault}
              >
                <img
                  src={getSpectateButtonSrc()}
                  alt={isSpectator ? t("game.ariaPlay") : t("game.ariaSpectate")}
                  className="h-10 w-auto object-contain"
                  style={touchImageStyle}
                  draggable={false}
                />
              </div>
            </div>
          )}

          <div className="pointer-events-auto touch-none absolute bottom-6 right-4 flex items-center gap-3">
            <div
              role="button"
              tabIndex={0}
              aria-label={t("game.ariaDefense")}
              className="h-20 w-20 touch-none select-none"
              style={touchButtonStyle}
              onContextMenu={preventContextMenu}
              onTouchStart={suppressTouchDefault}
              onTouchEnd={suppressTouchDefault}
              onTouchCancel={suppressTouchDefault}
              onPointerDown={
                allowSpellInput ? handleTapPress("q") : undefined
              }
              onPointerUp={
                allowSpellInput ? handleTapRelease("q") : undefined
              }
              onPointerLeave={
                allowSpellInput ? handleTapRelease("q") : undefined
              }
              onPointerCancel={
                allowSpellInput ? handleTapRelease("q") : undefined
              }
            >
              <img
                src={getButtonSrc("q")}
                alt={t("game.ariaDefense")}
                className="h-full w-full object-contain"
                style={touchImageStyle}
                draggable={false}
              />
            </div>
            <div
              role="button"
              tabIndex={0}
              aria-label={t("game.ariaAttack")}
              className="h-20 w-20 touch-none select-none"
              style={touchButtonStyle}
              onContextMenu={preventContextMenu}
              onTouchStart={suppressTouchDefault}
              onTouchEnd={suppressTouchDefault}
              onTouchCancel={suppressTouchDefault}
              onPointerDown={
                allowSpellInput ? handleTapPress("e") : undefined
              }
              onPointerUp={
                allowSpellInput ? handleTapRelease("e") : undefined
              }
              onPointerLeave={
                allowSpellInput ? handleTapRelease("e") : undefined
              }
              onPointerCancel={
                allowSpellInput ? handleTapRelease("e") : undefined
              }
            >
              <img
                src={getButtonSrc("e")}
                alt={t("game.ariaAttack")}
                className="h-full w-full object-contain"
                style={touchImageStyle}
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pong;
