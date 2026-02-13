import { spawn, SpawnOptions } from 'child_process';
import { logger } from './logger.js';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Execute an external CLI command with timeout and streaming output.
 * Returns stdout/stderr and exit code.
 */
export function exec(
  command: string,
  args: string[],
  options: SpawnOptions & { timeoutMs?: number } = {}
): Promise<ExecResult> {
  const { timeoutMs = 5 * 60 * 1000, ...spawnOpts } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      ...spawnOpts,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const exitCode = code ?? 1;
      if (exitCode !== 0) {
        logger.warn(`Command exited with code ${exitCode}: ${command} ${args.slice(0, 3).join(' ')}...`);
      }
      resolve({ stdout, stderr, code: exitCode });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
