import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HOST = '127.0.0.1';
const PORT = 19080;
const ALLOWED_ORIGIN = 'https://desaichk.com';
const BLOCKED_ORIGIN = 'https://evil.example';
const tempDir = await mkdtemp(join(tmpdir(), 'track-backend-test-'));

const backend = spawn(process.execPath, ['index.js'], {
  cwd: new URL('.', import.meta.url),
  env: {
    ...process.env,
    HOST,
    PORT: String(PORT),
    CORS_ORIGINS: ALLOWED_ORIGIN,
    TRACK_STORE_PATH: join(tempDir, 'tracks.json'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
backend.stderr.on('data', (chunk) => {
  stderr += chunk;
});

try {
  await waitForHealth();

  const allowed = await fetch(`http://${HOST}:${PORT}/health`, {
    method: 'OPTIONS',
    headers: { Origin: ALLOWED_ORIGIN },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);

  const blocked = await fetch(`http://${HOST}:${PORT}/health`, {
    method: 'OPTIONS',
    headers: { Origin: BLOCKED_ORIGIN },
  });
  assert.equal(blocked.status, 204);
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);

  console.log('PASS allowed origin:', ALLOWED_ORIGIN);
  console.log('PASS blocked origin:', BLOCKED_ORIGIN);
  console.log('PASS health endpoint and CORS policy');
} finally {
  backend.kill();
  await rm(tempDir, { recursive: true, force: true });
}

async function waitForHealth() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (backend.exitCode !== null) {
      throw new Error(`Backend exited early with code ${backend.exitCode}: ${stderr}`);
    }

    try {
      const response = await fetch(`http://${HOST}:${PORT}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // The child process may still be binding the test port.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Backend did not become ready: ${stderr}`);
}
