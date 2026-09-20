# Release v2.9.0 — Dependency Pruning, Offline WASM Core, and Security Hardening

Omni Tool **v2.9.0** is a major quality, performance, and security milestone audited and hardened under the **Ponytail**, **Get Shit Done (GSD)**, **Ralph Loop**, and **CodeRabbit** agentic frameworks.

---

### 🌟 Highlights & Key Changes

#### 1. ⚡ Aggressive Bloat & Dependency Pruning (Ponytail)
- Pruned **16 unnecessary npm packages** from `package.json` (`uuid`, `date-fns`, `sharp`, `puppeteer-core`, `next-auth`, `next-intl`, `prisma`, `@prisma/client`, `z-ai-web-dev-sdk`, `@mdxeditor/editor`, `react-syntax-highlighter`, `vaul`, `recharts`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `input-otp`).
- Replaced third-party libraries with native web standards:
  - `crypto.randomUUID()` instead of `uuid`
  - Native `Intl.DateTimeFormat` instead of `date-fns`
- Removed 313 bloated packages from `node_modules`.
- Deleted unused UI components and dead shell scripts.

#### 2. 🛡️ Security Hardening & Zero-Data-Leakage (CodeRabbit)
- **SharedArrayBuffer Security**: Restored strict `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers in `next.config.ts` required for multi-threaded WebAssembly execution.
- **AI Proxy Route Protection**: Added in-memory IP rate-limiting (30 req/min) and input validation (caps at 50 messages) to `/api/ai` to prevent abuse.
- **Dynamic Origin Resolution**: Eliminated hardcoded production URLs in `src/lib/gemini.ts` in favor of dynamic relative origin resolution.
- **Sanitized Secrets**: Completely stripped fallback Firebase credentials and enforced environment variable binding.

#### 3. 📦 100% Offline-First WebAssembly Engine
- Extracted and self-hosted the 32.2 MB `ffmpeg-core.wasm` locally in `public/ffmpeg/`.
- Reconfigured `src/lib/ffmpeg/ffmpeg-context.tsx` to load WASM directly from local paths, eliminating external CDN dependencies (e.g. `unpkg.com`) and enabling complete offline reliability.

#### 4. 🧪 Automated Verification & CI/CD (Ralph Loop & GSD)
- Fixed all React 19 Rules-of-Hooks and render-purity errors across components (`AskOmni`, `tool-shell`, `ai-message-bubble`, `sidebar`, `permission-gate`, `qr-studio`).
- Added native Node test suite in `tests/core-logic.test.mjs` running pure logic checks for audio parameters, formatters, and watermark bounds.
- Added GitHub Actions CI pipeline (`.github/workflows/ci.yml`) covering automated testing, linting, typechecking, and production builds.
- Added GitHub Pull Request template (`.github/pull_request_template.md`).

---

### 📊 Verification Summary

- **Node Test Runner (`npm test`)**: 4/4 passed (0 failures)
- **ESLint (`npx eslint . --quiet`)**: 0 errors, 0 warnings
- **TypeScript (`npx tsc --noEmit`)**: 0 type errors
- **Next.js Production Build (`npm run build`)**: 11/11 pages compiled & optimized successfully
