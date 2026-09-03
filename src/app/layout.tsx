import type { Metadata, Viewport } from "next";
import { EB_Garamond, Geist_Mono, Manrope, Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CookieBanner } from "@/components/shell/cookie-banner";
import { AnalyticsProvider } from "@/components/shell/analytics-provider";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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
  metadataBase: new URL("https://omnitool.app"),
  title: {
    default: "OMNI TOOL — Client-Side Media Suite",
    template: "%s | OMNI TOOL",
  },
  description:
    "Heavy-duty client-side media engineering suite. Convert video, edit audio, forge documents, record screens, and erase watermarks 100% on-device with WebAssembly. Zero file uploads.",
  applicationName: "OMNI TOOL",
  keywords: [
    "Omni Tool",
    "ffmpeg.wasm",
    "client-side media",
    "video converter",
    "audio editor",
    "watermark eraser",
    "screen recorder",
    "WebAssembly media suite",
    "offline video compressor",
    "private audio editor",
  ],
  authors: [{ name: "Omni Tool Team", url: "https://omnitool.app" }],
  creator: "Omni Tool",
  publisher: "Omni Tool",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OMNI TOOL — Client-Side Media Suite",
    description:
      "Convert video, edit audio, forge documents, capture your screen and vault the results — 100% locally with WebAssembly. Zero uploads.",
    url: "https://omnitool.app",
    siteName: "OMNI TOOL",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "OMNI TOOL — 100% On-Device WebAssembly Media Suite",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OMNI TOOL — Client-Side Media Suite",
    description:
      "Heavy-duty utility suite powered by WebAssembly. Zero file uploads, total privacy.",
    images: ["/logo.jpg"],
    creator: "@omnitool",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.jpg" },
    ],
    apple: [{ url: "/logo.jpg" }],
  },
  manifest: "/manifest.webmanifest",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var p = localStorage.getItem('omni_theme_preference');
                var t = p ? JSON.parse(p).state?.theme : null;
                if (t === 'terracotta') {
                  document.documentElement.setAttribute('data-theme', 'terracotta');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${orbitron.variable} ${spaceGrotesk.variable} ${geistMono.variable} ${ebGaramond.variable} ${manrope.variable} antialiased bg-background text-foreground min-h-screen w-full overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]`}
      >
        <AnalyticsProvider />
        {children}
        <CookieBanner />
        <Toaster />
      </body>
    </html>
  );
}
