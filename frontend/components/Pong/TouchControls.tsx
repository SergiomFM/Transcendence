"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Pong } from "./pong";
import { Events } from "./pongEvents";

interface TouchControlsProps {
  pong: Pong | null;
}

/**
 * Touch button that fires simulated key events on press/release.
 * Uses image-based buttons from /buttons/ folder.
 */
function TouchButton({
  normalSrc,
  pressedSrc,
  onPressStart,
  onPressEnd,
  forcePressed,
  className,
  style,
}: {
  normalSrc: string;
  pressedSrc?: string;
  onPressStart: () => void;
  onPressEnd: () => void;
  forcePressed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  const pressedRef = useRef(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const onPressStartRef = useRef(onPressStart);
  const onPressEndRef = useRef(onPressEnd);

  useEffect(() => {
    onPressStartRef.current = onPressStart;
    onPressEndRef.current = onPressEnd;
  });

  const isPressed = forcePressed || pressed;

  // Attach touch listeners with { passive: false } so preventDefault works
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pressedRef.current) {
        pressedRef.current = true;
        setPressed(true);
        navigator.vibrate?.(15);
        onPressStartRef.current();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (pressedRef.current) {
        pressedRef.current = false;
        setPressed(false);
        onPressEndRef.current();
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: false });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pressedRef.current) {
        pressedRef.current = true;
        setPressed(true);
        onPressStart();
      }
    },
    [onPressStart]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (pressedRef.current) {
        pressedRef.current = false;
        setPressed(false);
        onPressEnd();
      }
    },
    [onPressEnd]
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={isPressed && pressedSrc ? pressedSrc : normalSrc}
      alt=""
      draggable={false}
      className={className}
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: "auto",
        imageRendering: "pixelated",
        ...style,
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

export default function TouchControls({ pong }: TouchControlsProps) {
  const [isSpectator, setIsSpectator] = useState(false);
  const [seatsAvailable, setSeatsAvailable] = useState(0);
  const [localReady, setLocalReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll pong state to keep spectator/player/ready/running status in sync
  useEffect(() => {
    if (!pong) return;

    const sync = () => {
      setIsSpectator(pong.isSpectator);
      setSeatsAvailable(pong.seatsAvailable);
      setLocalReady(pong.localReady);
      setIsRunning(pong.running);
    };
    sync();
    intervalRef.current = setInterval(sync, 200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pong]);

  const simulateDown = useCallback(
    (key: string) => {
      if (pong) Events.simulateKeyDown(pong, key);
    },
    [pong]
  );

  const simulateUp = useCallback(
    (key: string) => {
      if (pong) Events.simulateKeyUp(pong, key);
    },
    [pong]
  );

  if (!pong) return null;

  return (
    <div
      className="absolute inset-0 z-40 pointer-events-none"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Bottom-left: Movement arrows */}
      <div
        className="absolute flex gap-1 pointer-events-auto"
        style={{ bottom: "3%", left: "2%" }}
      >
        <TouchButton
          normalSrc="/buttons/left.png"
          pressedSrc="/buttons/left_pressed.png"
          onPressStart={() => simulateDown("a")}
          onPressEnd={() => simulateUp("a")}
          style={{ width: "clamp(48px, 10vw, 80px)", height: "auto" }}
        />
        <TouchButton
          normalSrc="/buttons/right.png"
          pressedSrc="/buttons/right_pressed.png"
          onPressStart={() => simulateDown("d")}
          onPressEnd={() => simulateUp("d")}
          style={{ width: "clamp(48px, 10vw, 80px)", height: "auto" }}
        />
      </div>

      {/* Bottom-right: Shield (Q) + Sword (E) */}
      <div
        className="absolute flex gap-1 pointer-events-auto"
        style={{ bottom: "3%", right: "2%" }}
      >
        <TouchButton
          normalSrc="/buttons/def.png"
          pressedSrc="/buttons/def_pressed.png"
          onPressStart={() => simulateDown("q")}
          onPressEnd={() => simulateUp("q")}
          style={{ width: "clamp(48px, 10vw, 80px)", height: "auto" }}
        />
        <TouchButton
          normalSrc="/buttons/atk.png"
          pressedSrc="/buttons/atk_pressed.png"
          onPressStart={() => simulateDown("e")}
          onPressEnd={() => simulateUp("e")}
          style={{ width: "clamp(48px, 10vw, 80px)", height: "auto" }}
        />
      </div>

      {/* Middle-left: Ready button (only when not running and not spectator) */}
      {!isSpectator && !isRunning && (
        <div
          className="absolute pointer-events-auto"
          style={{ top: "50%", left: "2%", transform: "translateY(-50%)" }}
        >
          <TouchButton
            normalSrc="/buttons/ready.png"
            pressedSrc="/buttons/ready_pressed.png"
            forcePressed={localReady}
            onPressStart={() => simulateDown(" ")}
            onPressEnd={() => simulateUp(" ")}
            style={{ width: "clamp(60px, 10vw, 100px)", height: "auto" }}
          />
        </div>
      )}

      {/* Middle-right: Play / Spectate toggle */}
      {pong.online && (
        <div
          className="absolute pointer-events-auto"
          style={{ top: "50%", right: "2%", transform: "translateY(-50%)" }}
        >
          {isSpectator ? (
            // Spectator sees "Play" button (claim seat)
            seatsAvailable > 0 ? (
              <TouchButton
                normalSrc="/buttons/play.png"
                pressedSrc="/buttons/play.png"
                onPressStart={() => simulateDown("c")}
                onPressEnd={() => simulateUp("c")}
                style={{ width: "clamp(60px, 10vw, 100px)", height: "auto" }}
              />
            ) : null
          ) : (
            // Player sees "Spectate" button
            <TouchButton
              normalSrc="/buttons/spectate.png"
              pressedSrc="/buttons/spectate.png"
              onPressStart={() => simulateDown("c")}
              onPressEnd={() => simulateUp("c")}
              style={{ width: "clamp(60px, 10vw, 100px)", height: "auto" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
