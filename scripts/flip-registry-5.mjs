// Flip Phase 5 tools online + engine-free. Run: bun scripts/flip-registry-5.mjs
import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/tools/registry.ts";
let src = readFileSync(path, "utf8");
const ids = ["vault", "studio-recorder"];
for (const id of ids) {
  const re = new RegExp(`(id: "${id}"[\\s\\S]*?phase: 5,\\n)(    status: )"locked"`);
  src = src.replace(re, "$1$2\"online\"");
  const accentRe = new RegExp(`(id: "${id}"[\\s\\S]*?accent: "[a-z]+",)(\\n)`);
  src = src.replace(accentRe, "$1$2    requiresEngine: false,$2");
}
writeFileSync(path, src);
console.log(
  "online:", (src.match(/status: "online"/g) || []).length,
  "| engine-free:", (src.match(/requiresEngine: false/g) || []).length,
);
