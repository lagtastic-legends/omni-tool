import type { Metadata, Viewport } from "next";
import { Geist_Mono, Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OMNI TOOL — Client-Side Media Suite",
  description:
    "A heavy-duty utility suite that converts, compresses and engineers media 100% on-device with WebAssembly. Video, audio, documents, imaging — zero uploads.",
  keywords: [
    "Omni Tool",
    "ffmpeg.wasm",
    "client-side media",
    "video converter",
    "audio editor",
    "WebAssembly",
  ],
  authors: [{ name: "Omni Tool" }],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 2 28 9v14L16 30 4 23V9z' fill='%23a855f7'/%3E%3Ccircle cx='16' cy='16' r='4.5' fill='%23090709'/%3E%3Ccircle cx='16' cy='16' r='1.8' fill='%236ee7ff'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0813",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
