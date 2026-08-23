#!/usr/bin/env bash
# =============================================================================
# OMNI TOOL — mobile build pipeline (run on a machine with Android Studio)
#
#   ./scripts/build-mobile.sh          # export web app + sync into android/
#   ./scripts/build-mobile.sh --open   # ...then open the project in Studio
#
# The sandbox keeps `next build` off-limits (the dev server owns .next/),
# so this script is the production path for the Capacitor shell.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▸ Static-exporting the web app (MOBILE_EXPORT=1)…"
MOBILE_EXPORT=1 bun run build

echo "▸ Syncing export → Capacitor android/…"
bunx cap sync android

echo "▸ Done. android/app contains the native shell."
if [[ "${1:-}" == "--open" ]]; then
  echo "▸ Opening Android Studio…"
  bunx cap open android
else
  echo "  Run with --open to launch Android Studio, or:"
  echo "    cd android && ./gradlew assembleDebug"
fi
