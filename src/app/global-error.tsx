"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ZenoDeck Global Fatal Error]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0813] text-white p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-zinc-950/90 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 text-xl font-bold">
            !
          </div>
          <h1 className="text-base font-bold uppercase tracking-wider text-rose-300">
            System Reboot Required
          </h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            ZenoDeck encountered a critical layout fault. Tap reboot to restart the application.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:bg-violet-500 active:scale-95 transition-all cursor-pointer"
          >
            Reboot Application
          </button>
        </div>
      </body>
    </html>
  );
}
