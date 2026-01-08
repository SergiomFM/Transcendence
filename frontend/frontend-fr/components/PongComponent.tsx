"use client";

import React, { useEffect, useRef } from "react";

export default function PongComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let cleanup: (() => void) | undefined;

    // Dynamically import Babylon code only on client-side after mount
    import("./Pong/main").then(({ startPong }) => {
      startPong(canvas).then((pongRef) => {
        cleanup = pongRef;
      });
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
