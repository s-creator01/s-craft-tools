# S Craft — Third-Party Licenses & Legal Notices

S-Craft Tools includes third-party software and assets under their own licenses.
This inventory is under review and is not yet a complete clearance for release.

---

## 1. pdf-lib

- License: MIT License
- Copyright (c) 2019 Andrew Dillon
- Repository: https://github.com/Hopding/pdf-lib

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 2. JSZip

- License: MIT License
- Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso
- Repository: https://github.com/Stuk/jszip

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 3. browser-image-compression

- License: MIT License
- Copyright (c) 2019 Donald Chan
- Repository: https://github.com/Donaldcwl/browser-image-compression
- Version: 2.0.2. The complete upstream notice and license text is in `public/licenses/browser-image-compression-2.0.2-MIT.txt`.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Bundled typography

The Add Text and Images editor bundles the Latin font files Inter, Lato, Montserrat, Open Sans, Poppins, and Roboto from the Google Fonts project. Each family is distributed under the SIL Open Font License 1.1; the corresponding license and copyright notice is included in `public/licenses/fonts/` alongside the local assets in `public/fonts/`. These files are served locally so font selection works offline.

---

## 4. PDFCraft

- License: GNU Affero General Public License v3.0 (AGPL-3.0)
- Copyright (c) PDFCraft Contributors
- Reference Path: `../PDFCraft/`
- Included code: all 397 files in this project's `public/pdfjs-viewer/` that exist at PDFCraft commit `3baf59ce50d64b60a058436c35b96de5a5f55715` are byte-identical to that snapshot, including `viewer.html`. That viewer contains PDF.js and PDFCraft-specific code; preserve the applicable upstream notices and licenses. The six additional `.js` files are a byte-identical copy of PDFCraft's AGPL-licensed `pdfcraft_signature_scanner.mjs` and five aliases (`pdf.js`, `pdf.sandbox.js`, `pdf.worker.js`, `viewer.js`, `pdf_viewer.js`) that match their `.mjs` counterparts after replacing `.mjs` references with `.js`.
- The historical audit also identifies PDFCraft processors as references for `public/js/tools/pdf.js`. A comparison with PDFCraft snapshot `3baf59ce50d64b60a058436c35b96de5a5f55715` found shared short token sequences in split, sign and watermark comparisons, including common canvas and range-parsing patterns; it does not establish whether code was adapted. Preserve the relevant notices and treat this file's origin as unresolved until its history is established or it is independently replaced and tested.
- The page-splitting function was subsequently rewritten against the existing pdf-lib and JSZip APIs and tested with exported PDFs and a ZIP. This was done with knowledge of the previous implementation, not as a clean-room review, and does not establish the origin of the other PDF functions.
- Compared source snapshot: https://github.com/PDFCraftTool/pdfcraft/tree/3baf59ce50d64b60a058436c35b96de5a5f55715
- Upstream license text: `public/licenses/upstream/pdfcraft-AGPL-3.0.txt`.

---

## 5. Mazanoke

- License: GNU General Public License v3.0 (GPL-3.0)
- Copyright (c) civilblur / Mazanoke Contributors
- Reference Path: `../Mazanoke/`
- Compared snapshot: https://github.com/civilblur/mazanoke/tree/ceab516ade2a68f3c0abef8bd8fa03ada3ac3e7b. Its bundled `browser-image-compression.js`, our copy, and the original `browser-image-compression@2.0.2` npm distribution have the same SHA-256, `c6713a21756570af4c230f706faac4f0187845928bd14fd5910210d1cdc6fb87`. This separately authored library carries MIT terms (see entry 3); the match does not establish which distribution supplied our copy.
- Possible reuse: the historical source audit says compression and conversion logic was adapted from Mazanoke. The former quality-search implementation was replaced with a descending-quality sequence after the historical code had been reviewed; this is not a clean-room claim. Comparisons are limited to the specified snapshot and do not establish the authorship of all image code.
- Metadata and batch comparison: `stripImageMetadata` and `batchProcessImages` were compared against the snapshot's `assets/js` files, including `compression.js`, `utilities.js`, and `download.js`. Mazanoke uses its compression library's `preserveExif: false` option and builds ZIPs from downloaded output elements; these functions instead remove JPEG/PNG metadata segments or re-encode, and build a ZIP from callback results. A token comparison found only short common API/control-flow sequences, not a matching implementation. This comparison does not exclude adaptation from another version.
- Target-size compression now delegates to the bundled MIT-licensed `browser-image-compression` 2.0.2 (entry 3), with its web worker disabled; format preparation uses this project's canvas conversion function. The rest of `image.js`, including the canvas conversion helper, remains subject to the provenance review.
- The current Convert Image function delegates to the project’s existing browser canvas resize pipeline at original dimensions. JPEG, PNG and WebP downloads passed in Chrome. This removed the separate conversion implementation; it does not establish the history of the shared resize code.
- Upstream license text: `public/licenses/upstream/mazanoke-GPL-3.0.txt`. Actual code provenance remains under review.

---

## 6. omni-tools

- License: MIT License
- Copyright (c) 2024 Ibrahima Gaye Coulibaly
- Repository: https://github.com/iib0011/omni-tools
- Reused Concepts: Pure algorithms for text, time, and number transformations; parameter schemas.
- Upstream copyright and license text: `public/licenses/upstream/omni-tools-MIT.txt`.

---

## 7. ToolsForImage-OSS

- License: MIT License
- Copyright (c) 2025 ToolsForImage Contributors
- Repository: https://github.com/mlbrothers/ToolsForImage-OSS
- Reused Concepts: Aspect ratio calculations and image annotation options.
- Upstream copyright and license text: `public/licenses/upstream/toolsforimage-MIT.txt`.

---

## 8. FFmpeg

- License: LGPL 2.1+ / GPL 2.0+ (depending on build configuration)
- Executable located at: `ffmpeg`
- Executed locally via loopback (127.0.0.1) without modifying or statically linking the binary.

## 12. PDF.js

- The bundled `public/vendor/pdf.min.mjs` identifies Copyright 2024 Mozilla Foundation and the Apache License 2.0 in its header.
- Project: https://github.com/mozilla/pdf.js
- License text: `public/licenses/apache-2.0.txt`.
- The bundled viewer includes additional PDFCraft code; see the PDFCraft entry.
- Additional font files Alex Brush, Allura, Handlee, Kalam and Sacramento in `public/pdfjs-viewer/standard_fonts/` identify the SIL Open Font License 1.1 in their embedded metadata. Their respective license and copyright files are in `public/licenses/fonts/`.
- Other viewer assets and their individual notices remain subject to the ongoing release inventory.

## 13. QPDF WebAssembly package

- The files `public/vendor/qpdf.js` and `qpdf.wasm` were built for this project with Emscripten 6.0.13. Build recipe: `scripts/build-qpdf-wasm.sh`; the recipe pins the following source commits:
  - ISC-licensed wrapper from https://github.com/soulehshaikh99/qpdf-wasm at `c27ea373f901c774cd599eb17fe903b6fbbd3095` (v0.4.1), including its JPEG patch. This fork credits the original wrapper and build pipeline to Tommaso Pifferi of https://github.com/neslinesli93/qpdf-wasm.
  - Apache-2.0-licensed QPDF 12.4.2 at https://github.com/qpdf/qpdf/tree/4eba95899886e851cc41d76886483b347612f2a8.
  - zlib 1.3.2 at https://github.com/madler/zlib/tree/da607da739fa6047df13e66a2af6b8bec7c2a498 and libjpeg-turbo 3.2.1 at https://github.com/libjpeg-turbo/libjpeg-turbo/tree/7b4993786d856cbccabfc0ed2f923ba000e326cc, under their respective license terms.
- Copyright, licenses and QPDF's NOTICE are provided in `public/licenses/qpdf-wasm-0.4.1/`. The build script changes the archive tool on macOS and builds the required QPDF library target; it does not use the prebuilt npm binary. Further release audit and regression testing remain required.

## Browser media engine

The static build uses the MIT-licensed `@ffmpeg/ffmpeg@0.12.15` JavaScript wrapper and a locally built, single-threaded FFmpeg WebAssembly core. The core is **GPL-2.0-or-later** because its configuration enables GPL code and links x264. `scripts/ffmpeg-core-source-lock.json` records the exact source revisions, configuration, SDL port archive hash and core file hashes; `scripts/build-ffmpeg-core.sh` contains the build instructions.

The core was built with Emscripten 3.1.40 from FFmpeg 5.1.4 and pinned revisions of x264, libvpx, LAME, Ogg, Opus and Vorbis, using the ffmpeg.wasm build and patched CLI sources at commit `71aa99d37c02a7b4c435275ca9ef50e612f6efa1`. Emscripten's pinned SDL 2.24.2 port is also used. The respective copyright, licenses and patent notice are in `public/licenses/ffmpeg-core/`; the lock file links to each exact source revision.

Before public distribution, make the complete corresponding source and build instructions for this exact binary available under the applicable GPL terms, review all bundled component notices and verify the final hosted artifacts. The old npm `@ffmpeg/core` 0.12.10 is no longer used by the current build; older Git history and generated artifacts still need review before public release.
