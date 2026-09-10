# Contributing to Omni Tool

Thank you for your interest in contributing to **Omni Tool**! We welcome contributions from developers, designers, and open-source enthusiasts.

---

## Code of Conduct

* Be respectful, inclusive, and collaborative.
* Focus on delivering high-performance, private, client-side tools that never compromise user data privacy.

---

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lagtastic-legends/omni-tool.git
   cd omni-tool
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Mobile Build Pipeline (Android APK)

Omni Tool uses Capacitor to package the static Next.js export into an Android application:

1. **Generate Static Export:**
   - **Windows (PowerShell):**
     ```powershell
     $env:MOBILE_EXPORT = "1"; npm run build
     ```
   - **Linux / macOS (Bash):**
     ```bash
     MOBILE_EXPORT=1 npm run build
     ```

2. **Sync Assets to Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Build Android APK:**
   - **Debug Build:**
     ```bash
     cd android
     ./gradlew assembleDebug      # Linux/macOS
     .\gradlew.bat assembleDebug  # Windows
     ```
     Output: `android/app/build/outputs/apk/debug/app-debug.apk`

   - **Signed Release Build:**
     ```bash
     cd android
     ./gradlew assembleRelease      # Linux/macOS
     .\gradlew.bat assembleRelease  # Windows
     ```
     Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Pull Request Guidelines

1. Create a feature branch (`git checkout -b feature/my-new-tool`).
2. Follow existing TypeScript, Tailwind CSS, and component conventions.
3. Ensure zero file data is ever dispatched to network sockets or external APIs.
4. Test that `npm run build` succeeds with 0 errors.
5. Submit your PR with a clear summary of your changes.

---

## Questions & Support

Reach out to the maintainers at [support.omnitool.com@gmail.com](mailto:support.omnitool.com@gmail.com).
