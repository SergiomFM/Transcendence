"use client";

import { useEffect, useRef } from "react";
import { startPong } from "./main";

const Pong = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    startPong(canvasRef.current);
  }, [canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`image-rendering-pixelated ${className || ""}`}
    />
  );
};

export default Pong;
