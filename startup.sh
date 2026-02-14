#!/bin/bash
# Azure App Service Startup Script

# Install system dependencies
apt-get update
apt-get install -y --no-install-recommends \
    libreoffice \
    ghostscript \
    qpdf \
    tesseract-ocr \
    imagemagick \
    ffmpeg \
    calibre

# Navigate to app directory
cd /home/site/wwwroot

# Install Node.js dependencies
npm run install:all

# Build the frontend
npm run build

# Start the server
npm run start
