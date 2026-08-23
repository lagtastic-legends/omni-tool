#!/usr/bin/env bash
# =============================================================================
# OMNI TOOL — Firebase credential installer
#
# Drop your two downloaded credential files anywhere in the repo root (or
# pass paths as arguments) and this script wires them in:
#
#   ./scripts/setup-firebase.sh                                # auto-find
#   ./scripts/setup-firebase.sh my-gservices.json my-web.json
#
# After running: rebuild the APK (./scripts/build-mobile.sh) and reload the
# web app — the auth gate engages automatically.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

ANDROID_SRC="${1:-$(ls google-services.json 2>/dev/null || true)}"
WEB_SRC="${2:-$(ls firebase-config.json 2>/dev/null || true)}"

if [[ -z "$ANDROID_SRC" || ! -f "$ANDROID_SRC" ]]; then
  echo "✗ google-services.json not found."
  echo "  Download it: Firebase console → Project settings → Your apps →"
  echo "  Android app (app.omnitool.suite) → google-services.json"
  echo "  Register with your debug/release SHA-1:"
  echo "    keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore"
  exit 1
fi

if [[ -z "$WEB_SRC" || ! -f "$WEB_SRC" ]]; then
  echo "✗ firebase-config.json not found."
  echo "  Download it: Firebase console → Project settings → Your apps →"
  echo "  Web app → Config → save as firebase-config.json"
  exit 1
fi

cp "$ANDROID_SRC" android/app/google-services.json
cp "$WEB_SRC" public/firebase-config.json
chmod 600 android/app/google-services.json public/firebase-config.json

echo "✓ installed android/app/google-services.json"
echo "✓ installed public/firebase-config.json"
echo
echo "Next steps:"
echo "  1. ./scripts/build-mobile.sh        # rebuild + sync the APK"
echo "  2. reload the web app               # gate engages automatically"
echo "  3. (release) add the release keystore SHA-1 in the Firebase console:"
echo "     keytool -list -v -alias your-key-alias -keystore your-release.jks"
