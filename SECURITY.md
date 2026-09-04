# Security Policy

## The Zero-Upload Guarantee

**Omni Tool** is built from the ground up on an absolute privacy architecture:
* **100% Client-Side Execution**: All media conversions, audio filter processing, PDF forging, and video compression occur strictly inside your device's memory using WebAssembly (@ffmpeg/ffmpeg, @cantoo/pdf-lib).
* **Zero Remote File Transfers**: No audio, video, image, or document data is ever transmitted, cached, or analyzed on remote servers.
* **Local Storage & Vault**: Files stored in the Vault reside exclusively in your browser's local IndexedDB and native Android sandboxed storage.

---

## Supported Versions

| Version | Supported          |
| :---    | :---               |
| 2.4.x   | :white_check_mark: |
| < 2.4   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability or privacy bug, please do not file a public issue. Instead, please report it privately:

* **Security & Support Email**: [support.omnitool.com@gmail.com](mailto:support.omnitool.com@gmail.com)
* **Response SLA**: We review and acknowledge all security reports within 24 hours.
