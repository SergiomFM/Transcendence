import Pong from "@/components/Pong";

const PongPage = ({}: {}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-10 h-dvh gap-5 bg-white text-black">
      <h1 className="text-center text-3xl font-extrabold">Pong Game</h1>
      <Pong className="aspect-854/480 h-full" />
    </div>
  );
};

export default PongPage;
