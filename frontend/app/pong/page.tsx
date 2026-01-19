import Pong from "@/components/Pong";

const PongPage = ({}: {}) => {
  const marqueeText = Array.from({ length: 50 })
    .map(() => "Pagina temporaria - ")
    .join("");

  return (
    <div className="w-full flex flex-col ">
      <div className="bg-yellow-400 text-yellow-700 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee">
          {marqueeText}
          {marqueeText}
        </div>
      </div>
      <div className="p-10 h-170 flex justify-center">
        <div className="aspect-854/480 h-full border-3 border-green-500 rounded-lg overflow-hidden">
          <Pong className="size-full" />
        </div>
      </div>
    </div>
  );
};

export default PongPage;
