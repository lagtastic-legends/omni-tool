/**
 * Unit Test Suite for Playlist Extraction & URL Parser
 */

import { extractPlaylistId } from "../src/lib/youtube/playlist";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function runTests() {
  console.log("=== Testing Playlist URL Parser ===");

  // 1. Standard playlist URL
  const p1 = extractPlaylistId("https://www.youtube.com/playlist?list=PL1234567890ABCDEF");
  assert(p1 === "PL1234567890ABCDEF", `Standard URL failed: ${p1}`);
  console.log("✓ Standard playlist URL parsed:", p1);

  // 2. Video URL with playlist param
  const p2 = extractPlaylistId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAl5_JZzRz3V_m8QeD0J2bK_q_8fR3L9");
  assert(p2 === "PLrAl5_JZzRz3V_m8QeD0J2bK_q_8fR3L9", `Watch + list param failed: ${p2}`);
  console.log("✓ Watch URL with playlist param parsed:", p2);

  // 3. Short youtu.be URL with playlist param
  const p3 = extractPlaylistId("https://youtu.be/dQw4w9WgXcQ?list=PL9876543210FEDCBA");
  assert(p3 === "PL9876543210FEDCBA", `Short youtu.be URL failed: ${p3}`);
  console.log("✓ Short URL with list param parsed:", p3);

  // 4. Raw playlist ID
  const p4 = extractPlaylistId("PLxyz123456789abcdef");
  assert(p4 === "PLxyz123456789abcdef", `Raw ID failed: ${p4}`);
  console.log("✓ Raw playlist ID parsed:", p4);

  // 5. Album / Release playlist (OLAK5uy_...)
  const p5 = extractPlaylistId("https://www.youtube.com/playlist?list=OLAK5uy_kXq_gL_xY7z");
  assert(p5 === "OLAK5uy_kXq_gL_xY7z", `Album playlist failed: ${p5}`);
  console.log("✓ Album playlist ID parsed:", p5);

  // 6. Plain video URL with no playlist (should return null)
  const p6 = extractPlaylistId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert(p6 === null, `Plain video should return null: ${p6}`);
  console.log("✓ Non-playlist URL correctly returned null");

  console.log("ALL PLAYLIST PARSER TESTS PASSED! (6/6)");
}

runTests();
