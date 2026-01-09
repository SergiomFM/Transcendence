export default function Home() {
  return (
    <div>
      <h1 className="text-center mt-10 text-2xl flex justify-center gap-3 flex-col w-full overflow-x-hidden">
        <span>Welcome to</span>
        <span className="font-pongFont1 text-4xl font-extrabold">
          {Array.from({ length: Math.floor(Math.random() * 10) + 3 }).map(
            () => "Transcendence"
          )}
        </span>
      </h1>

      <a href="/pong" className="flex justify-center mt-10">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Play Pong
        </button>
      </a>
    </div>
  );
}
