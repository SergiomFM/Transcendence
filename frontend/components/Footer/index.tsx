"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="w-full shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-md py-4 px-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© {year} Transcendence. {t("rights")}</span>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy-policy"
            className="transition-colors hover:text-primary hover:text-glow"
          >
            {t("privacy")}
          </Link>
          <Link
            href="/terms-of-service"
            className="transition-colors hover:text-primary hover:text-glow"
          >
            {t("terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
