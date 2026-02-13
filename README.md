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

## Quick Start

### Step 1: Install Dependencies

| Platform | Command |
|----------|---------|
| **Windows** | Right-click `INSTALL-WINDOWS.bat` → Run as Administrator |
| **macOS** | `chmod +x INSTALL-MAC.sh && ./INSTALL-MAC.sh` |
| **Linux** | `chmod +x INSTALL-LINUX.sh && ./INSTALL-LINUX.sh` |

### Step 2: Run Morphic

```bash
npm run install:all
npm run dev
```
Open http://localhost:5173

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
| **Watermark** | Add text/image watermarks |

### Image Tools
| Tool | Description |
|------|-------------|
| **Image Converter** | Convert between PNG, JPG, WebP, AVIF, TIFF, GIF |
| **Batch Processing** | Convert multiple images at once |
| **Quality Control** | Adjust compression and quality |

### Document Tools
| Tool | Description |
|------|-------------|
| **Document Converter** | Convert between PDF and other formats |
| **OCR** | Extract text from images and scanned PDFs |

### Why Morphic?
- 🔒 **100% Local** - All processing happens on your machine
- 📁 **No File Limits** - Process files of any size
- 🎨 **Modern UI** - Clean, intuitive interface with dark mode
- ⚡ **Fast** - Native performance with no upload/download delays
- 🌐 **Web App** - Runs in your browser

---

## Project Structure

```
morphic/
├── 📄 INSTALL-WINDOWS.bat     # Windows dependency installer
├── 📄 INSTALL-MAC.sh          # macOS dependency installer
├── 📄 INSTALL-LINUX.sh        # Linux dependency installer
├── 📄 icon.png                # App logo (2048x2048)
├── 📁 client/                 # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Tool pages
│   │   ├── services/          # API client
│   │   └── contexts/          # React contexts
└── 📁 server/                 # Express backend
    └── src/
        ├── routes/            # API endpoints
        ├── services/          # Processing logic
        └── utils/             # Helpers
```

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **Backend** | Express 5, pdf-lib, Sharp, Tesseract.js |

---

## Development

### Prerequisites
- Node.js 18+

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build frontend |
| `npm run install:all` | Install all dependencies |

---

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Server Port | `server/src/config/index.ts` | 3000 |
| Upload Limit | `server/src/index.ts` | 500MB |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">

**Built with ❤️ for privacy-conscious users**

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>
