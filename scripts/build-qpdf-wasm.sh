#!/usr/bin/env bash
# Build from pinned sources. Run in a shell with Emscripten 6.0.13 activated.
# This writes to an empty output directory supplied as the only argument.
set -euo pipefail

if [[ $# != 1 || ! -d "$1" || -n "$(ls -A "$1")" ]]; then
  echo 'Usage: build-qpdf-wasm.sh EMPTY_OUTPUT_DIRECTORY' >&2; exit 1
fi
out=$(cd "$1" && pwd)
for tool in git emcc em++ emar emconfigure emcmake emmake cmake pkg-config make patch java; do
  command -v "$tool" >/dev/null || { echo "Missing: $tool" >&2; exit 1; }
done
emcc --version | head -1 | grep -F '6.0.13' >/dev/null || { echo 'Emscripten 6.0.13 required' >&2; exit 1; }
build=$(mktemp -d "${TMPDIR:-/tmp}/scraft-qpdf-build.XXXXXXXX")
echo "Working directory: $build"
clone_at() {
  git init -q "$2"
  git -C "$2" fetch -q --depth=1 "$1" "$3"
  git -C "$2" checkout -q --detach FETCH_HEAD
  [[ $(git -C "$2" rev-parse HEAD) == "$3" ]]
}
clone_at https://github.com/soulehshaikh99/qpdf-wasm.git "$build/wrapper" c27ea373f901c774cd599eb17fe903b6fbbd3095
clone_at https://github.com/madler/zlib.git "$build/zlib" da607da739fa6047df13e66a2af6b8bec7c2a498
clone_at https://github.com/libjpeg-turbo/libjpeg-turbo.git "$build/jpeg" 7b4993786d856cbccabfc0ed2f923ba000e326cc
clone_at https://github.com/qpdf/qpdf.git "$build/qpdf" 4eba95899886e851cc41d76886483b347612f2a8
prefix="$build/out"
mkdir -p "$prefix"
export CPPFLAGS="-I$prefix/include" LDFLAGS="-L$prefix/lib"
export PKG_CONFIG_PATH="$prefix/lib/pkgconfig" EM_PKG_CONFIG_PATH="$prefix/lib/pkgconfig"
export CFLAGS='-Oz -flto -fvisibility=hidden' CXXFLAGS='-Oz -flto -fvisibility=hidden -fexceptions'
(
  cd "$build/zlib"
  emconfigure ./configure --prefix="$prefix" --static
  # zlib's configure chooses Apple libtool on macOS, which cannot archive wasm.
  emmake make -j4 AR=emar ARFLAGS=rcs install
)
(
  cd "$build/jpeg"
  patch -p1 < "$build/wrapper/patches/jpeg-turbo.patch"
  emcmake cmake . -DCMAKE_INSTALL_PREFIX="$prefix" -DENABLE_SHARED=off -DWITH_SIMD=0 -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="$CFLAGS"
  emmake make -j4 install
)
emcmake cmake -S "$build/qpdf" -B "$build/qpdf/build" -DCMAKE_INSTALL_PREFIX="$prefix" -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF
cmake --build "$build/qpdf/build" --target libqpdf -j 4
em++ "$LDFLAGS" "$CPPFLAGS" $CFLAGS $CXXFLAGS --closure 1 \
  --pre-js "$build/wrapper/js/pre.js" --post-js "$build/wrapper/js/post.js" \
  -s ALLOW_MEMORY_GROWTH=1 -s MIN_NODE_VERSION=200000 \
  -s 'EXPORTED_RUNTIME_METHODS=["callMain","FS","NODEFS","WORKERFS","ENV"]' \
  -s 'INCOMING_MODULE_JS_API=["noInitialRun","locateFile","preRun","thisProgram"]' \
  -s NO_DISABLE_EXCEPTION_CATCHING=1 -s MODULARIZE=1 -o "$out/qpdf.js" \
  "$build/qpdf/build/libqpdf/libqpdf.a" "$build/qpdf/qpdf/qpdf.cc" \
  -I "$build/qpdf/include" -lnodefs.js -lworkerfs.js -lz -ljpeg
echo "Built qpdf.js and qpdf.wasm in $out"
