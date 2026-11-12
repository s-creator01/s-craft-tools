// Assemble the reviewed FFmpeg sources next to the browser engine at build time.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../sources/ffmpeg-core/', import.meta.url));
const destination = fileURLToPath(new URL('../public/licenses/ffmpeg-core/source-bundle.zip', import.meta.url));
const vendor = await readFile(new URL('../public/vendor/jszip.min.js', import.meta.url), 'utf8');
const moduleObject = { exports: {} };
new Function('module', 'exports', 'require', vendor)(moduleObject, moduleObject.exports, createRequire(import.meta.url));
const JSZip = moduleObject.exports;
const checksumText = await readFile(path.join(root, 'SHA256SUMS'), 'utf8');
const expected = new Map(checksumText.trim().split('\n').map(line => {
  const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
  if (!match) throw new Error('Invalid FFmpeg source checksum entry.');
  return [match[2], match[1]];
}));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [];
async function collect(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await collect(path.join(directory, entry.name), name);
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Unsupported source-bundle entry: ${name}`);
  }
}
await collect(root);
files.sort();
for (const name of files) {
  if (name === 'SHA256SUMS') continue;
  if (!expected.has(name) || digest(await readFile(path.join(root, name))) !== expected.get(name)) {
    throw new Error(`FFmpeg source checksum mismatch: ${name}`);
  }
}
if (files.length - 1 !== expected.size) throw new Error('FFmpeg source checksum inventory differs from files.');
for (const name of ['build-ffmpeg-core.sh', 'ffmpeg-core-source-lock.json']) {
  const bundled = await readFile(path.join(root, name));
  const script = await readFile(new URL(`./${name}`, import.meta.url));
  const notice = await readFile(new URL(`../public/licenses/ffmpeg-core/${name}`, import.meta.url));
  if (!bundled.equals(script) || !bundled.equals(notice)) throw new Error(`FFmpeg source copies differ: ${name}`);
}
const lock = JSON.parse(await readFile(path.join(root, 'ffmpeg-core-source-lock.json'), 'utf8'));
for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  const bytes = await readFile(new URL(`../vendor/ffmpeg-core/${name}`, import.meta.url));
  if (digest(bytes) !== lock.outputs[name]) throw new Error(`FFmpeg engine does not match source lock: ${name}`);
}
const zip = new JSZip();
for (const name of files) {
  zip.file(name, await readFile(path.join(root, name)), { date: new Date('2000-01-01T00:00:00Z'), createFolders: false });
}
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE', platform: 'UNIX' }));
console.log(`Prepared FFmpeg source download (${files.length} files).`);
