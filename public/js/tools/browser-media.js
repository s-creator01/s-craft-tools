const assets = new URL('../../assets/ffmpeg/', import.meta.url);
const maxBytes = 100 * 1024 * 1024;
const video = ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p'];
const mp3 = ['-vn', '-c:a', 'libmp3lame'];
const audioFormats = {
  mp3: ['libmp3lame', 'audio/mpeg'],
  wav: ['pcm_s16le', 'audio/wav'],
  aac: ['aac', 'audio/aac'],
  ogg: ['libvorbis', 'audio/ogg'],
};
const videoFormats = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
const even = (value) => Math.max(2, Math.floor(Number(value) / 2) * 2);

function command(operation, options, input) {
  const source = ['-i', input];
  const audio = (filter) => [...source, ...mp3, '-af', filter];
  const movie = (filter) => [...source, ...video, '-c:a', 'aac', '-vf', filter];
  const trim = ['-ss', String(options.start), ...source, '-t', String(options.end - options.start)];
  switch (operation) {
    case 'trim-video': return ['mp4', [...trim, ...video, '-c:a', 'aac']];
    case 'compress-video': return ['mp4', [...source, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', ({ low: '32', medium: '28', high: '23' })[options.quality] ?? '28', '-c:a', 'aac']];
    case 'crop-video': {
      const ratio = ({ '1:1': '1', '16:9': '16/9', '4:3': '4/3', '9:16': '9/16' })[options.aspect] ?? '1';
      return ['mp4', movie(`crop=trunc(min(iw,ih*(${ratio}))/2)*2:trunc(min(ih,iw/(${ratio}))/2)*2`.replaceAll(',', '\\,'))];
    }
    case 'resize-video': return ['mp4', movie(`scale=${even(options.width)}:${even(options.height)}`)];
    case 'rotate-video': {
      const filter = ({ horizontal: 'hflip', vertical: 'vflip' })[options.flip]
        ?? ({ 90: 'transpose=1', 180: 'hflip,vflip', 270: 'transpose=2' })[options.angle] ?? 'null';
      return ['mp4', movie(filter)];
    }
    case 'speed-video': return ['mp4', [...movie(`setpts=PTS/${Number(options.speed)}`), '-af', `atempo=${Number(options.speed)}`]];
    case 'mute-video': return ['mp4', [...source, ...video, '-an']];
    case 'convert-video': {
      if (!Object.hasOwn(videoFormats, options.format)) throw new Error('Unsupported video format.');
      return [options.format, [...source, ...(options.format === 'webm' ? ['-c:v', 'libvpx', '-deadline', 'realtime', '-threads', '1', '-c:a', 'libopus'] : [...video, '-c:a', 'aac'])]];
    }
    case 'trim-audio': return ['mp3', [...trim, ...mp3]];
    case 'loop-audio': return ['mp3', ['-stream_loop', String(Math.max(0, Math.min(19, Number(options.count) - 1))), ...source, ...mp3]];
    case 'speed-audio': return ['mp3', audio(`atempo=${Number(options.speed)}`)];
    case 'volume-audio': return ['mp3', audio(`volume=${Number(options.volume) / 100}`)];
    case 'compress-audio': return ['mp3', [...source, ...mp3, '-b:a', /^\d+k$/.test(options.bitrate) ? options.bitrate : '128k']];
    case 'fade-audio': return ['mp3', audio(`afade=t=in:d=${Number(options.fadeIn)},afade=t=out:st=${Math.max(0, options.duration - options.fadeOut)}:d=${Number(options.fadeOut)}`)];
    case 'denoise-audio': return ['mp3', audio(`afftdn=nr=${({ light: 6, strong: 16 })[options.strength] ?? 10}:nf=-40`)];
    case 'extract-audio':
    case 'convert-audio': {
      if (!Object.hasOwn(audioFormats, options.format)) throw new Error('Unsupported audio format.');
      return [options.format, [...source, '-vn', '-c:a', audioFormats[options.format][0]]];
    }
    default: throw new Error('Unsupported media operation.');
  }
}

async function execute(engine, args) {
  if (await engine.exec(args, 300000) !== 0) {
    throw new Error('Could not process this media file. Check the format and settings, or try a shorter file.');
  }
}

let busy = false;
export async function processBrowserMedia(operation, files, options = {}) {
  if (!files.length || files.some((file) => !file.size)) throw new Error('Select a non-empty media file.');
  if (files.reduce((total, file) => total + file.size, 0) > maxBytes) {
    throw new Error('Browser exports accept up to 100 MiB total input. Use the local app for larger files.');
  }
  if (busy) throw new Error('Wait for the current export to finish.');
  busy = true;
  let engine;
  try {
    const { FFmpeg } = await import(new URL('index.js', assets));
    engine = new FFmpeg();
    await engine.load({ coreURL: new URL('ffmpeg-core.js', assets).href, wasmURL: new URL('ffmpeg-core.wasm', assets).href });
    const inputs = [];
    for (const [index, file] of files.entries()) {
      const name = `input-${index}`;
      inputs.push(name);
      await engine.writeFile(name, new Uint8Array(await file.arrayBuffer()));
    }
    let format;
    let args;
    if (operation === 'merge-videos' || operation === 'merge-audio') {
      if (inputs.length < 2) throw new Error('Select at least two files to merge.');
      const isVideo = operation === 'merge-videos';
      format = isVideo ? 'mp4' : 'mp3';
      const parts = [];
      for (const [index, input] of inputs.entries()) {
        const part = `part-${index}.${isVideo ? 'mp4' : 'wav'}`;
        let audioInput = [];
        if (isVideo) {
          const hasAudio = await engine.exec(['-v', 'error', '-i', input,
            '-map', '0:a:0', '-t', '0', '-f', 'null', '-'], 30000) === 0;
          audioInput = hasAudio ? ['-map', '0:v:0', '-map', '0:a:0', '-af', 'apad']
            : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-map', '0:v:0', '-map', '1:a:0'];
        }
        await execute(engine, ['-i', input, ...(isVideo
          ? [...audioInput, ...video, '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest', '-vf', 'scale=640:360:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30']
          : ['-vn', '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le']), part]);
        parts.push(part);
      }
      await engine.writeFile('concat.txt', new TextEncoder().encode(parts.map((part) => `file '${part}'\n`).join('')));
      args = ['-f', 'concat', '-i', 'concat.txt', ...(isVideo ? ['-c', 'copy'] : mp3)];
    } else {
      [format, args] = command(operation, options, inputs[0]);
    }
    const output = `output.${format}`;
    if (['compress-video', 'trim-video', 'crop-video', 'resize-video', 'speed-video', 'rotate-video'].includes(operation)) {
      args.push('-fpsmax', '60');
    }
    await execute(engine, [...args, output]);
    const data = await engine.readFile(output);
    if (!data.length) throw new Error('Export produced an empty file.');
    const mimeType = videoFormats[format] ?? audioFormats[format][1];
    const blob = new Blob([data], { type: mimeType });
    const fileName = `${files[0].name.replace(/\.[^.]+$/, '')}_${operation}.${format}`;
    return { blob, size: blob.size, fileName, mimeType };
  } finally {
    engine?.terminate();
    busy = false;
  }
}
