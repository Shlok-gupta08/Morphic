#!/bin/bash
# ============================================================
#  MORPHIC - Linux Dependency Installer
#  Run: chmod +x INSTALL-LINUX.sh && ./INSTALL-LINUX.sh
# ============================================================

echo ""
echo "==========================================================="
echo "  MORPHIC - Dependency Installer for Linux"
echo "==========================================================="
echo ""

# Detect package manager
if command -v apt &> /dev/null; then
    PKG_MANAGER="apt"
    INSTALL_CMD="sudo apt install -y"
    UPDATE_CMD="sudo apt update"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    INSTALL_CMD="sudo dnf install -y"
    UPDATE_CMD="sudo dnf check-update"
elif command -v pacman &> /dev/null; then
    PKG_MANAGER="pacman"
    INSTALL_CMD="sudo pacman -S --noconfirm"
    UPDATE_CMD="sudo pacman -Sy"
else
    echo "[!] Unsupported package manager."
    echo "    Please install dependencies manually:"
    echo "    - nodejs, npm"
    echo "    - libreoffice"
    echo "    - ffmpeg"
    echo "    - tesseract-ocr"
    echo "    - qpdf"
    echo "    - ghostscript"
    exit 1
fi

echo "Detected package manager: $PKG_MANAGER"
echo ""

echo "[1/7] Updating package lists..."
$UPDATE_CMD

echo ""
echo "[2/7] Installing Node.js..."
if [ "$PKG_MANAGER" = "apt" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    $INSTALL_CMD nodejs
elif [ "$PKG_MANAGER" = "dnf" ]; then
    $INSTALL_CMD nodejs npm
elif [ "$PKG_MANAGER" = "pacman" ]; then
    $INSTALL_CMD nodejs npm
fi

echo ""
echo "[3/7] Installing LibreOffice (for document conversion)..."
$INSTALL_CMD libreoffice

echo ""
echo "[4/7] Installing FFmpeg (for video/audio processing)..."
$INSTALL_CMD ffmpeg

echo ""
echo "[5/7] Installing Tesseract OCR (for text recognition)..."
if [ "$PKG_MANAGER" = "apt" ]; then
    $INSTALL_CMD tesseract-ocr
elif [ "$PKG_MANAGER" = "dnf" ]; then
    $INSTALL_CMD tesseract
elif [ "$PKG_MANAGER" = "pacman" ]; then
    $INSTALL_CMD tesseract
fi

echo ""
echo "[6/7] Installing QPDF (for PDF repair/encryption)..."
$INSTALL_CMD qpdf

echo ""
echo "[7/7] Installing Ghostscript (for PDF compression)..."
$INSTALL_CMD ghostscript

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
