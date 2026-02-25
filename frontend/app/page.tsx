import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations();
  // eslint-disable-next-line react-hooks/purity -- decorative random count is intentional
  const repeatCount = Math.floor(Math.random() * 10) + 3;

  return (
    <div className="relative flex flex-col gap-10 items-center justify-center px-4 min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Scanline overlay */}
      <div className="scanlines absolute inset-0 pointer-events-none" />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-up">
        <div className="text-center space-y-3">
          <p className="text-sm sm:text-base uppercase tracking-[0.3em] text-muted-foreground">
            {t("home.welcomeTo")}
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl text-primary text-glow-strong tracking-wide">
            Transcendence
          </h1>
        </div>

        {/* Decorative repeating text - the "glitch" feel */}
        <div className="w-full max-w-2xl overflow-hidden opacity-10 dark:opacity-15 select-none" aria-hidden="true">
          <p className="font-['pongFont1'] text-xs sm:text-sm text-primary text-center leading-relaxed break-all">
            {Array.from({ length: repeatCount })
              .map(() => "Transcendence")
              .join(" ")}
          </p>
        </div>

        {/* CTA Button */}
        <Button asChild size="lg" className="animate-pulse-glow text-base px-8 py-6">
          <a href="/pong">{t("home.playPong")}</a>
        </Button>
      </div>
    </div>
  );
}
