import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Omni Tool protects your data. All media operations execute 100% locally on-device with zero server uploads.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | OMNI TOOL",
    description:
      "All media processing runs 100% on-device in your browser. Zero uploads, total privacy.",
    url: "https://omnitool.app/privacy",
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 font-mono text-sm text-foreground">
      <h1 className="mb-6 font-display text-2xl font-bold">Privacy Policy</h1>
      <p className="mb-4">
        Omni Tool processes all media files directly on your device using WebAssembly.
        Your files never leave your browser, are never uploaded to any server, and are fully private.
      </p>
      <p className="mb-4">
        We use Google Firebase Authentication solely to verify your identity. Your basic
        profile information (name and email) is stored locally to maintain your session.
      </p>
      <a href="/" className="mt-8 inline-block text-primary hover:underline">
        ← Return to App
      </a>
    </div>
  );
}
