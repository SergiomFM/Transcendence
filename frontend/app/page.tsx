import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10 items-center justify-center">
      <h1 className="text-center mt-10 text-2xl flex justify-center gap-3 flex-col w-full overflow-x-hidden">
        <span>{t("home.welcomeTo")}</span>
        <span className="font-pongFont1 text-4xl font-extrabold">
          {Array.from({ length: Math.floor(Math.random() * 10) + 3 }).map(
            () => "Transcendence"
          )}
        </span>
      </h1>

      <Button asChild size="lg">
        <a href="/pong">{t("home.playPong")}</a>
      </Button>
    </div>
  );
}
