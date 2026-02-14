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
    && rm -rf /var/lib/apt/lists/*

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

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["npm", "run", "start"]
