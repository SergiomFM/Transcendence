import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import { Navbar } from "@/components/Navbar";
import { ServiceWorkerRegistration } from "@/components/sw-registration";

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
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
        className="antialiased grain"
      >
        <Providers>
          <ServiceWorkerRegistration />
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
