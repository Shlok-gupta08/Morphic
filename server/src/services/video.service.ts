import path from 'path';
import fs from 'fs';
import { exec } from '../utils/exec.js';
import { config } from '../config/index.js';
import { createTempDir, cleanupTempDir, writeTempFile, readTempFile } from '../utils/tempfile.js';

// ─── Video Format Conversion ────────────────────────────

export type VideoFormat = 'mp4' | 'avi' | 'mkv' | 'webm' | 'mov' | 'flv' | 'wmv' | 'gif' | 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac';

const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mkv', 'webm', 'mov', 'flv', 'wmv', 'ts', 'm4v', '3gp'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'wma', 'm4a', 'opus'];

export function isVideoFormat(ext: string): boolean {
  return VIDEO_EXTENSIONS.includes(ext.toLowerCase().replace('.', ''));
}

export function isAudioFormat(ext: string): boolean {
  return AUDIO_EXTENSIONS.includes(ext.toLowerCase().replace('.', ''));
}

export async function convertVideo(buffer: Buffer, inputFilename: string, targetFormat: VideoFormat, opts: {
  resolution?: string;   // e.g. "1920x1080"
  bitrate?: string;      // e.g. "2M"
  fps?: number;
  audioOnly?: boolean;
  videoOnly?: boolean;
  startTime?: string;    // e.g. "00:01:00"
  duration?: string;     // e.g. "00:00:30"
  crf?: number;          // quality (0-51, lower=better, 23=default)
} = {}): Promise<Buffer> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, inputFilename, buffer);
    const outName = path.basename(inputFilename, path.extname(inputFilename)) + '.' + targetFormat;
    const output = path.join(tmpDir, outName);

    const args: string[] = ['-y', '-i', input];

    // Time trimming
    if (opts.startTime) args.push('-ss', opts.startTime);
    if (opts.duration) args.push('-t', opts.duration);

    // Resolution
    if (opts.resolution) {
      const [w, h] = opts.resolution.split('x');
      args.push('-vf', `scale=${w}:${h}`);
    }

    // FPS
    if (opts.fps) args.push('-r', String(opts.fps));

    // Bitrate
    if (opts.bitrate) args.push('-b:v', opts.bitrate);

    // CRF quality
    if (opts.crf !== undefined) args.push('-crf', String(opts.crf));

    // Audio only
    if (opts.audioOnly) args.push('-vn');

    // Video only
    if (opts.videoOnly) args.push('-an');

    // GIF special handling
    if (targetFormat === 'gif') {
      const fps = opts.fps || 10;
      const scale = opts.resolution ? opts.resolution.split('x')[0] : '480';
      args.length = 0; // reset
      args.push('-y', '-i', input);
      if (opts.startTime) args.push('-ss', opts.startTime);
      if (opts.duration) args.push('-t', opts.duration);
      args.push(
        '-vf', `fps=${fps},scale=${scale}:-1:flags=lanczos`,
        '-gifflags', '+transdiff',
        output,
      );
    } else {
      // Add format-specific encoding settings for better compatibility
      if (targetFormat === 'mp4') {
        // Use H.264 for maximum compatibility
        args.push('-c:v', 'libx264', '-preset', 'medium', '-c:a', 'aac');
      } else if (targetFormat === 'webm') {
        // Use VP9 for WebM
        args.push('-c:v', 'libvpx-vp9', '-c:a', 'libopus');
      } else if (targetFormat === 'mkv') {
        // MKV can contain most codecs, use H.264
        args.push('-c:v', 'libx264', '-preset', 'medium', '-c:a', 'aac');
      } else if (targetFormat === 'avi') {
        // Use MPEG4 for AVI compatibility
        args.push('-c:v', 'mpeg4', '-c:a', 'mp3');
      } else if (targetFormat === 'mov') {
        // QuickTime - use H.264
        args.push('-c:v', 'libx264', '-c:a', 'aac');
      } else if (targetFormat === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-q:a', '2');
      } else if (targetFormat === 'wav') {
        args.push('-c:a', 'pcm_s16le');
      } else if (targetFormat === 'aac') {
        args.push('-c:a', 'aac', '-b:a', '192k');
      } else if (targetFormat === 'ogg') {
        args.push('-c:a', 'libvorbis', '-q:a', '5');
      } else if (targetFormat === 'flac') {
        args.push('-c:a', 'flac');
      }
      args.push(output);
    }

    const result = await exec(config.bins.ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });
    if (result.code !== 0) {
      // Extract more meaningful error message
      const errorLines = result.stderr.split('\n').filter(line => 
        line.includes('Error') || line.includes('error') || line.includes('Invalid')
      );
      const errorMsg = errorLines.length > 0 ? errorLines.join('; ') : result.stderr.slice(-500);
      throw new Error(`FFmpeg conversion failed: ${errorMsg}`);
    }
    if (!fs.existsSync(output)) throw new Error('FFmpeg did not produce output file');

    // Validate output file
    const outputBuffer = readTempFile(output);
    if (outputBuffer.length < 100) {
      throw new Error(`FFmpeg produced an unusually small file (${outputBuffer.length} bytes). Conversion may have failed.`);
    }

    return outputBuffer;
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── Extract Audio from Video ────────────────────────────

export async function extractAudio(buffer: Buffer, inputFilename: string, audioFormat: 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac' = 'mp3'): Promise<Buffer> {
  return convertVideo(buffer, inputFilename, audioFormat as VideoFormat, { audioOnly: true });
}

// ─── Video/Audio Info ────────────────────────────────────

export async function getMediaInfo(buffer: Buffer, inputFilename: string): Promise<Record<string, unknown>> {
  const tmpDir = createTempDir();
  try {
    const input = writeTempFile(tmpDir, inputFilename, buffer);

    const result = await exec(config.bins.ffmpeg.replace('ffmpeg', 'ffprobe'), [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      input,
    ]);

    if (result.code !== 0 && result.stdout.length === 0) {
      throw new Error(`ffprobe failed: ${result.stderr}`);
    }

    return JSON.parse(result.stdout);
  } finally {
    cleanupTempDir(tmpDir);
  }
}

// ─── Compress Video ──────────────────────────────────────

export async function compressVideo(buffer: Buffer, inputFilename: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<Buffer> {
  const crfMap = { low: 35, medium: 28, high: 23 };
  return convertVideo(buffer, inputFilename, 'mp4', { crf: crfMap[quality] });
}
