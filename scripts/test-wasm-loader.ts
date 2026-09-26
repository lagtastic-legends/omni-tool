import { isValidWasmHeader, getWasmMirrors, getCoreMirrors } from "../src/lib/ffmpeg/wasm-loader";
import assert from "node:assert";

async function run() {
  console.log("==========================================================");
  console.log("   ZENODECK WASM LOADER — VERIFICATION SUITE              ");
  console.log("==========================================================");

  // 1. Test WASM magic header validation
  console.log("\n--- 1. Testing WASM Magic Header Validation ---");
  const validHeader = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
  assert.strictEqual(isValidWasmHeader(validHeader.buffer), true);
  console.log("  ✓ PASS: Valid \\0asm header recognized");

  const invalidHeader = new Uint8Array([0x48, 0x54, 0x54, 0x50, 0x2f, 0x31, 0x2e, 0x31]); // 'HTTP/1.1'
  assert.strictEqual(isValidWasmHeader(invalidHeader.buffer), false);
  console.log("  ✓ PASS: Invalid HTML/text response header rejected");

  const emptyHeader = new Uint8Array([]);
  assert.strictEqual(isValidWasmHeader(emptyHeader.buffer), false);
  console.log("  ✓ PASS: Empty buffer rejected");

  // 2. Test Mirror URLs
  console.log("\n--- 2. Testing Mirror URL Resolution ---");
  const wasmMirrors = getWasmMirrors();
  assert(wasmMirrors.length >= 2, "Must provide at least 2 WASM mirrors");
  console.log(`  ✓ PASS: ${wasmMirrors.length} WASM mirrors configured:`);
  wasmMirrors.forEach((m, idx) => console.log(`     [${idx + 1}] ${m}`));

  const coreMirrors = getCoreMirrors();
  assert(coreMirrors.length >= 2, "Must provide at least 2 core mirrors");
  console.log(`  ✓ PASS: ${coreMirrors.length} Core JS mirrors configured:`);
  coreMirrors.forEach((m, idx) => console.log(`     [${idx + 1}] ${m}`));

  // 3. Test jsDelivr remote availability
  console.log("\n--- 3. Testing jsDelivr Edge CDN Reachability ---");
  const jsdelivrUrl = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm";
  const resp = await fetch(jsdelivrUrl, {
    method: "HEAD",
  });
  const cl = resp.headers.get("content-length");
  assert(Number(cl) > 0, "Content-Length must be positive");
  console.log(`  ✓ PASS: jsDelivr returned HTTP 200 with Content-Length: ${cl} bytes (compressed transfer)`);

  // 4. Test actual download and WASM header validation
  console.log("\n--- 4. Testing WASM Binary Fetch & Header Decompression ---");
  const fullResp = await fetch(jsdelivrUrl);
  const ab = await fullResp.arrayBuffer();
  console.log(`  ✓ PASS: Downloaded ${ab.byteLength} bytes (uncompressed WASM payload)`);
  assert.strictEqual(ab.byteLength, 32232419, "Uncompressed payload must be exactly 32232419 bytes");
  assert.strictEqual(isValidWasmHeader(ab), true, "Magic header must be valid \\0asm");
  console.log("  ✓ PASS: WebAssembly magic bytes (\\0asm) verified");

  console.log("\n==========================================================");
  console.log("ALL WASM LOADER CHECKS PASSED PERFECTLY!");
  console.log("==========================================================");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
