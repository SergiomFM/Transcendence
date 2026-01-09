import Pong from "@/components/Pong";

const PongPage = ({}: {}) => {
  return (
    <div className="w-full flex flex-col ">
      <marquee className="bg-yellow-400 text-yellow-700">
        {Array.from({ length: 100 }).map(() => "Pagina temporaria - ")}
      </marquee>
      <div className="p-10 h-170 flex justify-center">
        <div className="aspect-854/480 h-full border-3 border-green-500 rounded-lg overflow-hidden">
          <Pong className="size-full" />
        </div>
      </div>
    </div>
  );
};

export default PongPage;
