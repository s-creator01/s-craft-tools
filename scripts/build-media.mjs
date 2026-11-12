import { cp, mkdir } from 'node:fs/promises';
import './build-ffmpeg-source-bundle.mjs';

const target = new URL('../public/assets/ffmpeg/', import.meta.url);
await mkdir(target, { recursive: true });
for (const file of ['index.js', 'classes.js', 'const.js', 'errors.js', 'utils.js', 'worker.js', 'types.js']) {
  await cp(new URL(`../node_modules/@ffmpeg/ffmpeg/dist/esm/${file}`, import.meta.url), new URL(file, target));
}
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  await cp(new URL(`../vendor/ffmpeg-core/${file}`, import.meta.url), new URL(file, target));
}
