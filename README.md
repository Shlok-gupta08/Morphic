# Morphic

<div align="center">

<img src="icon.png" alt="Morphic Logo" width="120" height="120" />

**A powerful, privacy-first file converter that runs entirely on your machine.**

*No cloud uploads. No file size limits. No subscriptions.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## Getting Started

### Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org/)
- **Git** — [Download here](https://git-scm.com/)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/shlokgupta/morphic.git
cd morphic
```

**2. Install system dependencies**

Morphic uses several open-source tools for file processing. Run the appropriate installer for your platform:

| Platform | Instructions |
|----------|-------------|
| **Windows** | Right-click `scripts/INSTALL-WINDOWS.bat` → **Run as Administrator** |
| **macOS** | `chmod +x scripts/INSTALL-MAC.sh && ./scripts/INSTALL-MAC.sh` |
| **Linux** | `chmod +x scripts/INSTALL-LINUX.sh && ./scripts/INSTALL-LINUX.sh` |

> **Note:** These scripts install LibreOffice, FFmpeg, Tesseract OCR, QPDF, Ghostscript, ImageMagick, and Calibre. You can also install them manually if preferred.

**3. Install Node.js dependencies**

```bash
npm run install:all
```

**4. Start the application**

```bash
npm run dev
```

Open your browser and navigate to **http://localhost:5173**

---

## One-Click Launch (Windows)

After installation, you can use `Morphic.bat` to start the app with a double-click. To create a desktop shortcut:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Create-Shortcut.ps1
```

---

## Features

### PDF Tools
| Tool | Description |
|------|-------------|
| **Merge PDFs** | Combine multiple PDFs into one |
| **Split PDF** | Extract specific pages or split by ranges |
| **Compress PDF** | Reduce file size with quality presets |
| **Rotate Pages** | Rotate individual or all pages |
| **Remove Pages** | Delete unwanted pages |
| **Extract Pages** | Pull out specific pages |
| **Add Password** | Encrypt PDFs with password protection |
| **Remove Password** | Decrypt protected PDFs |
| **Flatten PDF** | Flatten form fields and annotations |
| **Repair PDF** | Fix corrupted PDF files |
| **Page Numbers** | Add page numbers to documents |
| **Edit Metadata** | Modify title, author, and properties |
| **Watermark** | Add text watermarks |

### Image Tools
| Tool | Description |
|------|-------------|
| **Image Converter** | Convert between PNG, JPG, WebP, AVIF, TIFF, GIF, BMP |
| **Compress Images** | Reduce image file size with quality control |
| **Batch Processing** | Convert multiple images at once |

### Document Tools
| Tool | Description |
|------|-------------|
| **Document Converter** | Convert between PDF, DOCX, TXT, HTML, and more |
| **OCR** | Extract text from images and scanned PDFs |
| **File Info** | View detailed metadata for any file |

### Why Morphic?

- 🔒 **100% Local** — All processing happens on your machine. Your files never leave your computer.
- 📁 **No File Limits** — Process files of any size without restrictions.
- 🎨 **Modern UI** — Clean, intuitive interface with dark mode support.
- ⚡ **Fast** — Native performance with no upload/download delays.
- 🔄 **Undo/Redo** — Full history support with keyboard shortcuts (Ctrl+Z / Ctrl+Y).
- 🌐 **Cross-Platform** — Works on Windows, macOS, and Linux.

---

## Project Structure

```
morphic/
├── 📁 scripts/                # Installation & setup scripts
│   ├── INSTALL-WINDOWS.bat    # Windows dependency installer
│   ├── INSTALL-MAC.sh         # macOS dependency installer
│   ├── INSTALL-LINUX.sh       # Linux dependency installer
│   └── Create-Shortcut.ps1    # Windows desktop shortcut creator
├── 📁 client/                 # React frontend (Vite + TypeScript)
│   └── src/
│       ├── components/        # Reusable UI components
│       ├── pages/             # Tool pages
│       ├── services/          # API client
│       ├── hooks/             # Custom React hooks
│       └── contexts/          # React context providers
├── 📁 server/                 # Express backend
│   └── src/
│       ├── routes/            # API endpoints
│       ├── services/          # File processing logic
│       └── utils/             # Helper utilities
├── 📄 Morphic.bat             # One-click launcher (Windows)
├── 📄 package.json            # Root package configuration
└── 📄 README.md               # You are here
```

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **Backend** | Express 5, Node.js, pdf-lib, Sharp, Tesseract.js |
| **Tools** | LibreOffice, FFmpeg, Ghostscript, QPDF, ImageMagick, Calibre |

---

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:client` | Start only the frontend |
| `npm run dev:server` | Start only the backend |
| `npm run build` | Build the frontend for production |
| `npm run build:all` | Build both frontend and backend |
| `npm run install:all` | Install all dependencies (root, client, server) |

### Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Server Port | `server/src/config/index.ts` | 3000 |
| Client Port | `client/vite.config.ts` | 5173 |
| Upload Limit | `server/src/index.ts` | 500MB |

---

## Troubleshooting

### Common Issues

**"Port already in use"**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

**"LibreOffice/FFmpeg not found"**
- Make sure you ran the install script for your platform
- Restart your terminal after installation
- Check that the tools are in your system PATH

**"Permission denied" on macOS/Linux**
```bash
chmod +x scripts/INSTALL-MAC.sh  # or INSTALL-LINUX.sh
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Shlok Gupta** — Design, development, and architecture.

- GitHub: [@shlokgupta](https://github.com/shlokgupta)

If you find this project useful, consider giving it a ⭐ on GitHub!

---

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests and documentation as appropriate.

---

## Acknowledgments

Built with these amazing open-source projects:
- [React](https://reactjs.org/) — UI framework
- [Vite](https://vitejs.dev/) — Build tool
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [pdf-lib](https://pdf-lib.js.org/) — PDF manipulation
- [Sharp](https://sharp.pixelplumbing.com/) — Image processing
- [LibreOffice](https://www.libreoffice.org/) — Document conversion
- [Tesseract](https://github.com/tesseract-ocr/tesseract) — OCR engine

---

<div align="center">

**Built with ❤️ for privacy-conscious users everywhere**

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>
