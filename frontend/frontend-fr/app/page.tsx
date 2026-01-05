"use client";

import { startPong } from "@/components/Pong/main";
import { useEffect } from "react";

export default function Home() {

  useEffect(() => {
    startPong();
  }, []);

  return (
    <div>
      <canvas id="PongCanvas" />
    </div>
  );
}
