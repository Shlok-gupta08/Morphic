import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

/** Create a unique temp directory for a job and return its path */
export function createTempDir(): string {
  const dir = path.join(config.tmpDir, uuidv4());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Clean up a temp directory */
export function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // silent — scheduled cleanup will handle it later
  }
}

/** Write an uploaded buffer to temp and return file path */
export function writeTempFile(dir: string, filename: string, data: Buffer): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, data);
  return filePath;
}

/** Read a file from temp and return buffer */
export function readTempFile(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

/** Periodic cleanup of old temp dirs (older than 30 minutes) */
export function startTempCleanup(intervalMs = 5 * 60 * 1000): void {
  setInterval(() => {
    try {
      const entries = fs.readdirSync(config.tmpDir, { withFileTypes: true });
      const now = Date.now();
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dirPath = path.join(config.tmpDir, entry.name);
        const stat = fs.statSync(dirPath);
        if (now - stat.mtimeMs > 30 * 60 * 1000) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      }
    } catch {
      // ignore cleanup errors
    }
  }, intervalMs);
}
