# Contributing to Omni Tool

Thank you for your interest in contributing to **Omni Tool**! We welcome contributions from developers, designers, and open-source enthusiasts.

---

## Code of Conduct

* Be respectful, inclusive, and collaborative.
* Focus on delivering high-performance, private, client-side tools that never compromise user data privacy.

---

## Development Setup

1. **Clone the repository:**
   `ash
   git clone https://github.com/lagtastic-legends/omni-tool.git
   cd omni-tool
   `

2. **Install dependencies:**
   `ash
   npm install
   # or
   bun install
   `

3. **Start local development server:**
   `ash
   npm run dev
   `
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Mobile Build Pipeline (Android APK)

Omni Tool uses Capacitor to package the static Next.js export into an Android application:

1. **Generate Static Export:**
   `powershell
   $env:MOBILE_EXPORT = "1"; npm run build
   `

2. **Sync Assets to Capacitor:**
   `ash
   npx cap sync android
   `

3. **Build Android APK:**
   `powershell
   cd android
   .\gradlew.bat assembleDebug
   `

---

## Pull Request Guidelines

1. Create a feature branch (git checkout -b feature/my-new-tool).
2. Follow existing TypeScript, Tailwind CSS, and component conventions.
3. Ensure zero file data is ever dispatched to network sockets or external APIs.
4. Test that 
pm run build succeeds with 0 errors.
5. Submit your PR with a clear summary of your changes.

---

## Questions & Support

Reach out to the maintainers at [support.omnitool.com@gmail.com](mailto:support.omnitool.com@gmail.com).
