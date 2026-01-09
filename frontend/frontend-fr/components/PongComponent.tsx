"use client";

import React, { useEffect, useRef } from "react";

export default function PongComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    // Prevent double initialization in React Strict Mode
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    // Dynamically import Babylon code only on client-side after mount
    import("./Pong/main")
      .then(({ startPong }) => {
        return startPong(canvas);
      })
      .then((cleanup) => {
        cleanupRef.current = cleanup;
      })
      .catch((error) => {
        console.error("Failed to initialize Pong:", error);
        isInitializedRef.current = false;
      });

    return () => {
      // Cleanup on unmount
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        display: 'block',
        outline: 'none',
        border: 'none',
        // Critical for pixel art: disable browser image smoothing
        imageRendering: 'pixelated',
        // Cross-browser compatibility for crisp pixels
        WebkitImageRendering: 'pixelated',
        msInterpolationMode: 'nearest-neighbor',
      } as React.CSSProperties} 
    />
  );
}
