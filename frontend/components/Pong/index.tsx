"use client";

import { useEffect, useRef } from "react";
import { startPong } from "./main";

interface PongProps {
  className?: string;
  online?: boolean;
  serverUrl?: string;
  gameServerUrl?: string;
}

const Pong = ({
  className,
  online = false,
  serverUrl,
  gameServerUrl,
}: PongProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let cleanup: (() => void) | undefined;

    startPong(canvasRef.current, {
      online,
      serverUrl,
      gameServerUrl,
    }).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [online, serverUrl, gameServerUrl]);

  return (
    <canvas
      ref={canvasRef}
      className={`image-rendering-pixelated ${className || ""}`}
    />
  );
};

export default Pong;
