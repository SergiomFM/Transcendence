"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { startPong } from "./main";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointers = useRef<Record<string, number | undefined>>({});
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

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
    }).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [online, serverUrl, gameServerUrl, roomId, onSessionReplaced]);

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

  const dispatchKey = (key: string, type: "keydown" | "keyup") => {
    if (typeof window === "undefined") return;
    const event = new KeyboardEvent(type, { key, bubbles: true });
    window.dispatchEvent(event);
    canvasRef.current?.dispatchEvent(event);
  };

  const allowDirectionalInput = !online || isRunning;
  const allowSpellInput = !online || isRunning || !isSpectator;

  const triggerHaptic = (duration = 15) => {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  };

  const [pressedButtons, setPressedButtons] = useState<Record<string, boolean>>({});

  const setPressed = (key: string, pressed: boolean) => {
    setPressedButtons((prev) => ({ ...prev, [key]: pressed }));
  };

  const handleDirectionalPress = (key: string) =>
    (event: PointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== undefined) return;
      activePointers.current[key] = pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      if (event.pointerType === "touch") triggerHaptic();
      setPressed(key, true);
      dispatchKey(key, "keydown");
    };

  const handleDirectionalRelease = (key: string) =>
    (event: PointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== pointerId) return;
      delete activePointers.current[key];
      event.currentTarget.releasePointerCapture?.(pointerId);
      setPressed(key, false);
      dispatchKey(key, "keyup");
    };

  const handleTapPress = (key: string) =>
    (event: PointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== undefined) return;
      activePointers.current[key] = pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      if (event.pointerType === "touch") triggerHaptic();
      setPressed(key, true);
    };

  const handleTapRelease = (key: string) =>
    (event: PointerEvent) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      if (activePointers.current[key] !== pointerId) return;
      delete activePointers.current[key];
      event.currentTarget.releasePointerCapture?.(pointerId);
      setPressed(key, false);
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
          style={{ aspectRatio: "16 / 9" }}
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
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute bottom-6 left-4 flex items-center gap-3">
            <button
              type="button"
              className="h-20 w-20 touch-none select-none"
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
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={getButtonSrc("a")}
                alt="Left"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
            <button
              type="button"
              className="h-20 w-20 touch-none select-none"
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
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={getButtonSrc("d")}
                alt="Right"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
          </div>

          <div className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
            <button
              type="button"
              className="touch-none select-none"
              onPointerDown={handleTapPress(" ")}
              onPointerUp={handleTapRelease(" ")}
              onPointerLeave={handleTapRelease(" ")}
              onPointerCancel={handleTapRelease(" ")}
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={getReadyButtonSrc()}
                alt="Ready"
                className="h-10 w-auto object-contain"
                draggable={false}
              />
            </button>
          </div>
          {online && (
            <div className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                <button
                  type="button"
                  className="touch-none select-none"
                  onPointerDown={handleTapPress("c")}
                  onPointerUp={handleTapRelease("c")}
                  onPointerLeave={handleTapRelease("c")}
                  onPointerCancel={handleTapRelease("c")}
                  onContextMenu={(e) => e.preventDefault()}
                >
                <img
                  src={getSpectateButtonSrc()}
                  alt={isSpectator ? "Play" : "Spectate"}
                  className="h-10 w-auto object-contain"
                  draggable={false}
                />
              </button>
            </div>
          )}

          <div className="pointer-events-auto absolute bottom-6 right-4 flex items-center gap-3">
            <button
              type="button"
              className="h-20 w-20 touch-none select-none"
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
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={getButtonSrc("q")}
                alt="Defense"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
            <button
              type="button"
              className="h-20 w-20 touch-none select-none"
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
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={getButtonSrc("e")}
                alt="Attack"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pong;
