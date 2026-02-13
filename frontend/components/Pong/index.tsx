"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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

    const canvas = canvasRef.current;

    canvas.width = 854;
    canvas.height = 480;

    let cleanup: (() => void) | undefined;

    startPong(canvas, {
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
      className={cn("w-full h-full", className)}
    />
  );
};

export default Pong;
