import { NextResponse } from "next/server";

/**
 * Health endpoint. `force-static` keeps this route compatible with the
 * Capacitor static export (`MOBILE_EXPORT=1`) — it is emitted as a static
 * JSON asset rather than a server function.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    app: "omni-tool",
    status: "ok",
    engine: "client-side-wasm",
  });
}
