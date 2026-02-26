import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegistration } from "@/components/sw-registration";

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Transcendence",
  description: "ft_transcendence - Multiplayer Pong Game",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Transcendence",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className="antialiased grain flex flex-col h-dvh overflow-hidden"
      >
        <Providers>
          <ServiceWorkerRegistration />
          <Navbar />
          <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
