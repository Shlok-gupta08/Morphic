#!/bin/bash
# ============================================================
#  MORPHIC - macOS Dependency Installer
#  Run: chmod +x INSTALL-MAC.sh && ./INSTALL-MAC.sh
# ============================================================

echo ""
echo "==========================================================="
echo "  MORPHIC - Dependency Installer for macOS"
echo "==========================================================="
echo ""

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "[1/7] Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "[1/7] Homebrew already installed ✓"
fi

echo ""
echo "[2/7] Installing Node.js..."
brew install node

echo ""
echo "[3/7] Installing LibreOffice (for document conversion)..."
brew install --cask libreoffice

echo ""
echo "[4/7] Installing FFmpeg (for video/audio processing)..."
brew install ffmpeg

echo ""
echo "[5/7] Installing Tesseract OCR (for text recognition)..."
brew install tesseract

echo ""
echo "[6/7] Installing QPDF (for PDF repair/encryption)..."
brew install qpdf

echo ""
echo "[7/7] Installing Ghostscript (for PDF compression)..."
brew install ghostscript

echo ""
echo "==========================================================="
echo "  Installation Complete!"
echo "==========================================================="
echo ""
echo "Next steps:"
echo "  Run in development mode:"
echo "    cd morphic"
echo "    npm run install:all"
echo "    npm run dev"
echo ""
