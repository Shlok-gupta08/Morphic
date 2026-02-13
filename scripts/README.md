# Installation Scripts

This folder contains one-click installers for Morphic's system dependencies.

## Which script should I run?

| Your OS | Script | How to Run |
|---------|--------|------------|
| Windows 10/11 | `INSTALL-WINDOWS.bat` | Right-click → **Run as Administrator** |
| macOS | `INSTALL-MAC.sh` | `chmod +x INSTALL-MAC.sh && ./INSTALL-MAC.sh` |
| Linux (Debian/Ubuntu) | `INSTALL-LINUX.sh` | `chmod +x INSTALL-LINUX.sh && ./INSTALL-LINUX.sh` |

## What gets installed?

These scripts install the following tools (all open-source):

| Tool | Purpose |
|------|---------|
| **Node.js** | JavaScript runtime |
| **LibreOffice** | Document conversion (DOCX → PDF, etc.) |
| **FFmpeg** | Video/audio processing |
| **Tesseract OCR** | Text recognition from images |
| **QPDF** | PDF encryption/decryption/repair |
| **Ghostscript** | PDF compression |
| **ImageMagick** | Image processing |
| **Calibre** | E-book conversion |

## After installation

Once the dependencies are installed:

```bash
# Go back to the project root
cd ..

# Install Node.js packages
npm run install:all

# Start the app
npm run dev
```

Then open http://localhost:5173 in your browser.

## Other scripts

- **Create-Shortcut.ps1** — Creates a desktop shortcut to launch Morphic (Windows only)

```powershell
powershell -ExecutionPolicy Bypass -File Create-Shortcut.ps1
```
