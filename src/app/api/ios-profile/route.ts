import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Serves the Apple Configuration Profile with the correct MIME type.
 * iOS requires `application/x-apple-aspen-config` to trigger the
 * profile installer — static file headers alone can be unreliable.
 */
export const dynamic = "force-static";

export async function GET() {
  const filePath = join(process.cwd(), "public", "zenodeck.mobileconfig");
  const body = readFileSync(filePath);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zenodeck.mobileconfig"',
    },
  });
}
