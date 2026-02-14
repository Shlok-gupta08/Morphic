# Use Node.js LTS on Debian
FROM node:20-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    ghostscript \
    qpdf \
    tesseract-ocr \
    tesseract-ocr-eng \
    imagemagick \
    ffmpeg \
    calibre \
    libvips-dev \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Fix ImageMagick policy to allow PDF operations
RUN if [ -f /etc/ImageMagick-6/policy.xml ]; then \
        sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml; \
    fi

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build frontend
RUN cd client && npm run build

# Build server
RUN cd server && npm run build

# Expose port (Azure will override via WEBSITES_PORT or PORT env var)
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start server
CMD ["npm", "run", "start"]
