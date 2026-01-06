import dynamic from "next/dynamic";

const PongComponent = dynamic(() => import("@/components/PongComponent"), {
  ssr: false,
});

export default function Home() {
  return (
    <div>
      <PongComponent />
    </div>
  );
}
