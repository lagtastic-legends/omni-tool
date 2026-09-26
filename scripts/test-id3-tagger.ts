/**
 * Unit Test Suite for ID3v2.3 Binary Metadata & Cover Art Tagger
 */

import { tagMp3Buffer, stripExistingId3v2 } from "../src/lib/youtube/id3-tagger";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function runTests() {
  console.log("=== Testing ID3v2.3 Tagger ===");

  // 1. Create a dummy MP3 audio buffer (simulate MPEG sync word: 0xFF 0xFB)
  const dummyAudio = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0x00, 0x01, 0x02, 0x03]);
  const dummyCover = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]); // JPEG magic

  // 2. Tag with metadata and embedded cover
  const tagged = await tagMp3Buffer(dummyAudio, {
    title: "Awesome Track 4K",
    artist: "Zeno Studio",
    album: "ZenoDeck Collection",
    year: "2026",
    coverImageBuffer: dummyCover,
  });

  // Verify ID3 header
  assert(tagged.length > dummyAudio.length, "Tagged file should be larger than raw audio");
  assert(tagged[0] === 0x49 && tagged[1] === 0x44 && tagged[2] === 0x33, "Header must start with 'ID3'");
  assert(tagged[3] === 0x03, "ID3 version should be 2.3");
  assert(tagged[4] === 0x00, "ID3 revision should be 0");

  // Read synchsafe tag length
  const tagSize =
    ((tagged[6] & 0x7f) << 21) |
    ((tagged[7] & 0x7f) << 14) |
    ((tagged[8] & 0x7f) << 7) |
    (tagged[9] & 0x7f);

  assert(tagSize > 0, "Synchsafe tag size must be > 0");
  console.log(`✓ ID3 Header Valid: Version 2.3, Tag Size: ${tagSize} bytes`);

  // Verify text frames are present in the buffer
  const decoder = new TextDecoder("utf-8");
  const fullTagStr = decoder.decode(tagged);

  assert(fullTagStr.includes("TIT2"), "Must contain TIT2 (Title) frame");
  assert(fullTagStr.includes("Awesome Track 4K"), "Must contain track title");
  assert(fullTagStr.includes("TPE1"), "Must contain TPE1 (Artist) frame");
  assert(fullTagStr.includes("Zeno Studio"), "Must contain artist name");
  assert(fullTagStr.includes("TALB"), "Must contain TALB (Album) frame");
  assert(fullTagStr.includes("TYER"), "Must contain TYER (Year) frame");
  assert(fullTagStr.includes("APIC"), "Must contain APIC (Cover Art) frame");
  console.log("✓ All frames found: TIT2, TPE1, TALB, TYER, APIC");

  // Test stripExistingId3v2
  const stripped = stripExistingId3v2(tagged);
  assert(stripped.length === dummyAudio.length, `Stripped length (${stripped.length}) must equal original audio length (${dummyAudio.length})`);
  assert(stripped[0] === 0xff && stripped[1] === 0xfb, "Stripped buffer must start with audio MPEG frame");
  console.log("✓ stripExistingId3v2 successfully recovered original audio data without tag corruption");

  console.log("ALL ID3 TAGGER TESTS PASSED! (5/5)");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
