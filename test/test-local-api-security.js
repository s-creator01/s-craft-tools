import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import http from 'node:http';

const dir = await mkdtemp(path.join(os.tmpdir(), 'scraft-api-test-'));
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '43000' }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Test server did not start')), 10000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/READY: \{"port":\s*(\d+)\}/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Test server exited: ${code}`)));
  });
  const base = `http://127.0.0.1:${port}`;
  const payload = JSON.stringify({ base64Data: Buffer.from('safe test').toString('base64'), filename: 'test.txt', targetDirectory: dir });
  const request = (headers) => fetch(`${base}/api/save-to-disk`, { method: 'POST', headers, body: payload });
  assert.equal((await request({ Origin: 'https://example.com', 'Content-Type': 'text/plain' })).status, 403);
  assert.equal((await request({ Origin: 'https://example.com', 'Content-Type': 'application/json' })).status, 403);
  assert.equal((await request({ 'Content-Type': 'text/plain' })).status, 403);
  const reboundStatus = await new Promise((resolve, reject) => {
    http.get(`${base}/api/media/status`, { headers: { Host: `evil.example:${port}` } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
  });
  assert.equal(reboundStatus, 403);
  assert.equal((await request({ Origin: base, 'Content-Type': 'application/json' })).status, 200);
  assert.equal(await readFile(path.join(dir, 'test.txt'), 'utf8'), 'safe test');
  console.log('Local API origin and content-type checks passed');
} finally {
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
  await rm(dir, { recursive: true, force: true });
}
