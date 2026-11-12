S-Craft Tools browser FFmpeg core - source bundle draft

The archives contain the source snapshots in ffmpeg-core-source-lock.json. SHA256SUMS covers the archives, build script, lock, this file, and bundled license notices. SDL2-2.24.2.zip is checked against the SHA-512 in the lock. Emscripten test-only submodules and ffmpeg.wasm testdata are not included. The compiler SDK and standard build tools are not included.

To build using these snapshots: install and activate Emscripten 3.1.40 with the commit shown in the lock, install the tools named in build-ffmpeg-core.sh, create an empty output folder, then run:
  SCRAFT_FFMPEG_SOURCE_BUNDLE=/absolute/path/to/this/folder bash build-ffmpeg-core.sh /absolute/path/to/empty/output
The SDK may still need to download its SDL2 port; the exact archive and its hash are included here. The build validates SHA256SUMS and matches its script and lock to this bundle. Compare output hashes with the lock. Exact reproduction across environments is not guaranteed.

The macOS toolchain used for the verified build reported Clang 17.0.0 at LLVM revision 2922e7cd9334797c24a317d41275f1258ef9ddd3. Its reported upstream source is https://github.com/llvm/llvm-project/tree/2922e7cd9334797c24a317d41275f1258ef9ddd3. This identifies the reported compiler revision; it does not independently verify the provenance of every prebuilt SDK component. Emscripten runtime sources and the corresponding musl, libc++, libc++abi, libunwind and compiler-rt notices are included in the archives and notices directory.

This is a local draft, not yet published. Before public release, verify all corresponding source and notices and make this exact package accessible without charge alongside the browser binary.
