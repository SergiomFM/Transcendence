"use client";
import dynamic from "next/dynamic";

const PongComponent = dynamic(() => import("@/components/PongComponent"), {
  ssr: false,
});

export default function PongClient() {
  return (
    <div>
      <PongComponent />
    </div>
  );
}
