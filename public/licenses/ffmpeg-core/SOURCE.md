# Browser FFmpeg core source and licenses

This project uses a custom single-thread FFmpeg WebAssembly core built from pinned sources. Its core files are distributed under GPL-2.0-or-later because the build enables GPL code and links x264. The JavaScript wrapper `@ffmpeg/ffmpeg` is MIT-licensed.

- [Source revisions, build flags, SDL port hash and output hashes](ffmpeg-core-source-lock.json)
- [Build script](build-ffmpeg-core.sh): activate the locked Emscripten 3.1.40 SDK and provide the listed build tools, then run it with an empty output directory. It can fetch the exact commits in the lock file or read the checked source archives in `sources/ffmpeg-core` from the project repository; see that folder's README.
- Copyright and license files for FFmpeg, x264, libvpx, LAME, Ogg, Opus, Vorbis, SDL2, Emscripten and toolchain runtime components are in this directory. Preserve the libvpx patent notice too.

The build generates [a source bundle for this core](source-bundle.zip) from the project repository's `sources/ffmpeg-core` folder. It contains the pinned source archives, build recipe, checksums and component notices. Distribute this bundle with the website at the same URL as this notice, and keep it available while distributing the binary. Before public release, verify the bundle's corresponding-source completeness and confirm the download on the actual host.
