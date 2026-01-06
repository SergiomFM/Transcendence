"use client";

import React, { useEffect, useRef } from "react";
import { startPong } from "./Pong/main";

export default function PongComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let cleanup: (() => void) | undefined;

    startPong(canvas).then((pongRef) => {
      cleanup = pongRef;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
