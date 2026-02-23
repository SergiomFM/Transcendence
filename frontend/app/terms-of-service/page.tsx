import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return { title: `${t("title")} – Transcendence` };
}

export default function TermsOfServicePage() {
  return <TermsContent />;
}

function TermsContent() {
  const t = useTranslations("terms");

  const sections = [
    { title: t("s1Title"), body: t("s1Body") },
    { title: t("s2Title"), body: t("s2Body") },
    { title: t("s3Title"), body: t("s3Body") },
    { title: t("s4Title"), body: t("s4Body") },
    { title: t("s5Title"), body: t("s5Body") },
    { title: t("s6Title"), body: t("s6Body") },
    { title: t("s7Title"), body: t("s7Body") },
    { title: t("s8Title"), body: t("s8Body") },
    { title: t("s9Title"), body: t("s9Body") },
    { title: t("s10Title"), body: t("s10Body") },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="border border-border/50 bg-card/50 backdrop-blur-sm p-8 space-y-8">
          {/* Header */}
          <div className="space-y-2 border-b border-border/50 pb-6">
            <h1 className="text-3xl text-primary text-glow">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
          </div>

          {/* Introduction */}
          <p className="text-muted-foreground leading-relaxed">{t("intro")}</p>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, idx) => (
              <section key={idx} className="space-y-2">
                <h2 className="text-lg text-primary">{section.title}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
