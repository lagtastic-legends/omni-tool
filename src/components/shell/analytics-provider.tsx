"use client";

import { useEffect } from "react";
import Script from "next/script";

export function AnalyticsProvider() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    // Check if consent was already given
    const consent = localStorage.getItem("omni_cookie_consent");
    if (consent === "accepted") {
      // Initialize analytics tracking
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("consent", "update", {
          analytics_storage: "granted",
        });
      }
    }

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("consent", "update", {
          analytics_storage: customEvent.detail ? "granted" : "denied",
        });
      }
    };

    window.addEventListener("omni_analytics_consent", handler);
    return () => window.removeEventListener("omni_analytics_consent", handler);
  }, []);

  if (!gaId) {
    // If no external GA ID is configured, return null (privacy-by-default)
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('consent', 'default', {
              'analytics_storage': 'denied'
            });
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              anonymize_ip: true
            });
          `,
        }}
      />
    </>
  );
}
