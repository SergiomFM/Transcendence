"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { startPong } from "./main";

interface PongProps {
  className?: string;
  online?: boolean;
  serverUrl?: string;
  gameServerUrl?: string;
  roomId?: string;
}

const Pong = ({
  className,
  online = false,
  serverUrl,
  gameServerUrl,
  roomId,
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
      roomId,
    }).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [online, serverUrl, gameServerUrl, roomId]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 854, height: 480 }}
      className={cn("w-full h-full", className)}
    />
  );
};

export default Pong;
