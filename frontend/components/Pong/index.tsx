"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
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
  const [showMobileControls, setShowMobileControls] = useState(false);

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

  const handleDirectionalPress = (key: string) => () =>
    dispatchKey(key, "keydown");
  const handleDirectionalRelease = (key: string) => () =>
    dispatchKey(key, "keyup");

  const handleTouchDirectionalPress = (key: string) =>
    (event: TouchEvent) => {
      event.preventDefault();
      triggerHaptic();
      dispatchKey(key, "keydown");
    };

  const handleTouchDirectionalRelease = (key: string) =>
    (event: TouchEvent) => {
      event.preventDefault();
      dispatchKey(key, "keyup");
    };

  const handleTapKey = (key: string) => () => {
    dispatchKey(key, "keydown");
    dispatchKey(key, "keyup");
  };

  const handleTouchTapKey = (key: string) => (event: TouchEvent) => {
    event.preventDefault();
    triggerHaptic();
    dispatchKey(key, "keydown");
    dispatchKey(key, "keyup");
  };

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
            className="h-16 w-16 rounded-full border border-white/30 bg-black/40 text-white text-2xl shadow-lg backdrop-blur active:bg-black/60 touch-none select-none"
            onPointerDown={handleDirectionalPress("a")}
            onPointerUp={handleDirectionalRelease("a")}
            onPointerLeave={handleDirectionalRelease("a")}
            onPointerCancel={handleDirectionalRelease("a")}
            onTouchStart={handleTouchDirectionalPress("a")}
            onTouchEnd={handleTouchDirectionalRelease("a")}
            onTouchCancel={handleTouchDirectionalRelease("a")}
          >
            &lt;
          </button>
          <button
            type="button"
            className="h-16 w-16 rounded-full border border-white/30 bg-black/40 text-white text-2xl shadow-lg backdrop-blur active:bg-black/60 touch-none select-none"
            onPointerDown={handleDirectionalPress("d")}
            onPointerUp={handleDirectionalRelease("d")}
            onPointerLeave={handleDirectionalRelease("d")}
            onPointerCancel={handleDirectionalRelease("d")}
            onTouchStart={handleTouchDirectionalPress("d")}
            onTouchEnd={handleTouchDirectionalRelease("d")}
            onTouchCancel={handleTouchDirectionalRelease("d")}
          >
            &gt;
          </button>
        </div>

        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button
            type="button"
            className="px-4 py-2.5 rounded-full border border-white/30 bg-black/40 text-white text-sm shadow-lg backdrop-blur active:bg-black/60 touch-none select-none"
            onClick={handleTapKey(" ")}
            onTouchStart={handleTouchTapKey(" ")}
          >
            Ready
          </button>
          {online && (
            <button
              type="button"
              className="px-4 py-2.5 rounded-full border border-white/30 bg-black/40 text-white text-sm shadow-lg backdrop-blur active:bg-black/60 touch-none select-none"
              onClick={handleTapKey("p")}
              onTouchStart={handleTouchTapKey("p")}
            >
              Spectate/Play
            </button>
          )}
        </div>

        <div className="pointer-events-auto absolute bottom-6 right-4 flex items-center gap-3">
          <button
            type="button"
            className="h-14 w-14 rounded-full border border-white/30 bg-black/40 text-white text-lg shadow-lg backdrop-blur active:bg-black/60 touch-none select-none"
            onClick={handleTapKey("q")}
            onTouchStart={handleTouchTapKey("q")}
          >
            Q
          </button>
          <button
            type="button"
            className="h-14 w-14 rounded-full border border-white/30 bg-black/40 text-white text-lg shadow-lg backdrop-blur active:bg-black/60 touch-none select-none"
            onClick={handleTapKey("e")}
            onTouchStart={handleTouchTapKey("e")}
          >
            E
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

export default Pong;
