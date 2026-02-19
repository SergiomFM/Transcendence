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
    window.addEventListener("pong:spectator", handleSpectator as EventListener);
    window.addEventListener("pong:ready", handleReady as EventListener);
    return () => {
      window.removeEventListener(
        "pong:spectator",
        handleSpectator as EventListener,
      );
      window.removeEventListener("pong:ready", handleReady as EventListener);
    };
  }, [online]);

  const dispatchKey = (key: string, type: "keydown" | "keyup") => {
    if (typeof window === "undefined") return;
    const event = new KeyboardEvent(type, { key, bubbles: true });
    window.dispatchEvent(event);
    canvasRef.current?.dispatchEvent(event);
  };

  const triggerHaptic = (duration = 15) => {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  };

  const [pressedButtons, setPressedButtons] = useState<Record<string, boolean>>({});

  const setPressed = (id: string, pressed: boolean) => {
    setPressedButtons((prev) => ({ ...prev, [id]: pressed }));
  };

  const handleDirectionalPress = (key: string, id: string) =>
    (event: PointerEvent) => {
      const pointerId = event.pointerId;
      if (activePointers.current[id] !== undefined) return;
      activePointers.current[id] = pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      if (event.pointerType === "touch") triggerHaptic();
      setPressed(id, true);
      dispatchKey(key, "keydown");
    };

  const handleDirectionalRelease = (key: string, id: string) =>
    (event: PointerEvent) => {
      const pointerId = event.pointerId;
      if (activePointers.current[id] !== pointerId) return;
      delete activePointers.current[id];
      event.currentTarget.releasePointerCapture?.(pointerId);
      setPressed(id, false);
      dispatchKey(key, "keyup");
    };

  const handleTapPress = (id: string) =>
    (event: PointerEvent) => {
      const pointerId = event.pointerId;
      if (activePointers.current[id] !== undefined) return;
      activePointers.current[id] = pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      if (event.pointerType === "touch") triggerHaptic();
      setPressed(id, true);
    };

  const handleTapRelease = (key: string, id: string) =>
    (event: PointerEvent) => {
      const pointerId = event.pointerId;
      if (activePointers.current[id] !== pointerId) return;
      delete activePointers.current[id];
      event.currentTarget.releasePointerCapture?.(pointerId);
      setPressed(id, false);
      dispatchKey(key, "keydown");
      dispatchKey(key, "keyup");
    };

  const getButtonSrc = (id: string) =>
    pressedButtons[id] ? `/buttons/${id}_pressed.png` : `/buttons/${id}.png`;

  const getReadyButtonSrc = () =>
    isReady ? "/buttons/ready_pressed.png" : "/buttons/ready.png";

  const getSpectateButtonSrc = () =>
    isSpectator ? "/buttons/play.png" : "/buttons/spectate.png";

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="h-full w-auto max-w-full max-h-full"
          style={{ aspectRatio: "16 / 9" }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%" }}
            className="block"
          />
        </div>
      </div>

      {showMobileControls && (
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute bottom-6 left-4 flex items-center gap-3">
            <button
              type="button"
              className="h-20 w-20 touch-none select-none"
              onPointerDown={handleDirectionalPress("a", "left")}
              onPointerUp={handleDirectionalRelease("a", "left")}
              onPointerLeave={handleDirectionalRelease("a", "left")}
              onPointerCancel={handleDirectionalRelease("a", "left")}
            >
              <img
                src={getButtonSrc("left")}
                alt="Left"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
            <button
              type="button"
              className="h-20 w-20 touch-none select-none"
              onPointerDown={handleDirectionalPress("d", "right")}
              onPointerUp={handleDirectionalRelease("d", "right")}
              onPointerLeave={handleDirectionalRelease("d", "right")}
              onPointerCancel={handleDirectionalRelease("d", "right")}
            >
              <img
                src={getButtonSrc("right")}
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
              onPointerDown={handleTapPress("ready")}
              onPointerUp={handleTapRelease(" ", "ready")}
              onPointerLeave={handleTapRelease(" ", "ready")}
              onPointerCancel={handleTapRelease(" ", "ready")}
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
                onPointerDown={handleTapPress("spec")}
                onPointerUp={handleTapRelease("c", "spec")}
                onPointerLeave={handleTapRelease("c", "spec")}
                onPointerCancel={handleTapRelease("c", "spec")}
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
              onPointerDown={handleTapPress("def")}
              onPointerUp={handleTapRelease("q", "def")}
              onPointerLeave={handleTapRelease("q", "def")}
              onPointerCancel={handleTapRelease("q", "def")}
            >
              <img
                src={getButtonSrc("def")}
                alt="Defense"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
            <button
              type="button"
              className="h-20 w-20 touch-none select-none"
              onPointerDown={handleTapPress("atk")}
              onPointerUp={handleTapRelease("e", "atk")}
              onPointerLeave={handleTapRelease("e", "atk")}
              onPointerCancel={handleTapRelease("e", "atk")}
            >
              <img
                src={getButtonSrc("atk")}
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
