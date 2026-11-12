#!/usr/bin/env bash
# Build the single-thread browser core from the commits in ffmpeg-core-source-lock.json.
# Activate Emscripten 3.1.40 first. This builds in a new temporary directory.
set -euo pipefail
if [[ $# != 1 || ! -d "$1" || -n "$(ls -A "$1")" ]]; then
  echo 'Usage: bash scripts/build-ffmpeg-core.sh EMPTY_OUTPUT_DIRECTORY' >&2; exit 1
fi
out=$(cd "$1" && pwd)
script_dir=$(cd "$(dirname "$0")" && pwd)
lock="$script_dir/ffmpeg-core-source-lock.json"
for tool in git python3 emcc em++ emconfigure emmake emranlib emnm emar node make autoconf automake libtoolize pkg-config perl sed; do
  command -v "$tool" >/dev/null || { echo "Missing: $tool" >&2; exit 1; }
done
version_line=$(emcc --version | head -1)
[[ "$version_line" == *'3.1.40'* && "$version_line" == *'5c27e79dd0a9c4e27ef2326841698cdd4f6b5784'* ]] || { echo 'The locked Emscripten 3.1.40 build is required' >&2; exit 1; }
[[ -n "${EMSDK:-}" ]] || { echo 'Activate the Emscripten SDK first' >&2; exit 1; }
port="$EMSDK/upstream/emscripten/tools/ports/sdl2.py"
expected_port_hash=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["sdl2_port"]["sha512"])' "$lock")
grep -F "$expected_port_hash" "$port" >/dev/null || { echo 'SDL port hash differs from lock file' >&2; exit 1; }
build=$(mktemp -d "${TMPDIR:-/tmp}/scraft-ffmpeg-build.XXXXXXXX")
echo "Working directory: $build"
clone_at() {
  local url=$1 dir=$2 commit=$3
  if [[ -n "${SCRAFT_FFMPEG_SOURCE_BUNDLE:-}" ]]; then
    local name
    name=$(basename "$dir")
    [[ "$name" != wrapper ]] || name=ffmpeg-wasm
    mkdir -p "$dir"
    tar -xzf "$SCRAFT_FFMPEG_SOURCE_BUNDLE/$name.tar.gz" -C "$dir"
    return
  fi
  git init -q "$dir"
  git -C "$dir" fetch -q --depth=1 "$url" "$commit"
  git -C "$dir" checkout -q --detach FETCH_HEAD
  [[ $(git -C "$dir" rev-parse HEAD) == "$commit" ]]
}
if [[ -n "${SCRAFT_FFMPEG_SOURCE_BUNDLE:-}" ]]; then
  SCRAFT_FFMPEG_SOURCE_BUNDLE=$(cd "$SCRAFT_FFMPEG_SOURCE_BUNDLE" && pwd)
  # Validate every listed archive and build input before extracting any source.
  (cd "$SCRAFT_FFMPEG_SOURCE_BUNDLE" && shasum -a 256 -c SHA256SUMS)
  cmp "$lock" "$SCRAFT_FFMPEG_SOURCE_BUNDLE/ffmpeg-core-source-lock.json"
  cmp "$script_dir/build-ffmpeg-core.sh" "$SCRAFT_FFMPEG_SOURCE_BUNDLE/build-ffmpeg-core.sh"
fi
wrapper_url=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["ffmpeg_wasm_build"]["repository"])' "$lock")
wrapper_commit=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["ffmpeg_wasm_build"]["commit"])' "$lock")
clone_at "$wrapper_url" "$build/wrapper" "$wrapper_commit"
python3 - "$lock" > "$build/sources.tsv" <<'PY'
import json,sys
for x in json.load(open(sys.argv[1]))['sources']:
 print(x['name'],x['repository'],x['commit'],sep='\t')
PY
while IFS=$'\t' read -r name url commit; do clone_at "$url" "$build/$name" "$commit"; done < "$build/sources.tsv"
export INSTALL_DIR="$build/out" FFMPEG_ST=1
unset FFMPEG_MT || true
export CFLAGS="-I$INSTALL_DIR/include -O3 -msimd128" CXXFLAGS="-I$INSTALL_DIR/include -O3 -msimd128"
export LDFLAGS="-L$INSTALL_DIR/lib -I$INSTALL_DIR/include -O3 -msimd128"
export EM_PKG_CONFIG_PATH="$INSTALL_DIR/lib/pkgconfig:$EMSDK/upstream/emscripten/system/lib/pkgconfig"
export PKG_CONFIG_PATH="$INSTALL_DIR/lib/pkgconfig"
export EM_TOOLCHAIN_FILE="$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"
mkdir -p "$INSTALL_DIR" "$build/scripts"
for lib in x264 lame libvpx ogg opus vorbis; do
  sed -E 's/ -j($|[[:space:]])/ -j4\1/g' "$build/wrapper/build/$lib.sh" > "$build/scripts/$lib.sh"
  if [[ "$lib" == vorbis ]]; then
    # Upstream uses GNU-only sed -i syntax; the same edit works on macOS and Linux with Perl.
    perl -pi -e 's/-mno-ieee-fp//g' "$build/vorbis/configure.ac"
    sed '/^sed -i /d' "$build/scripts/$lib.sh" > "$build/scripts/vorbis-portable.sh"
    mv "$build/scripts/vorbis-portable.sh" "$build/scripts/$lib.sh"
  fi
  echo "Building $lib"
  (cd "$build/$lib" && bash "$build/scripts/$lib.sh")
  if [[ "$lib" == libvpx ]]; then
    # libvpx embeds its configure command in the library. Remove the temporary
    # absolute prefix from that diagnostic string without changing the build flags.
    python3 - "$build/libvpx/vpx_config.c" <<'PY'
import os,sys
from pathlib import Path
p=Path(sys.argv[1]); p.write_text(p.read_text().replace(os.environ['INSTALL_DIR'], '<build-prefix>'))
PY
    # Some filesystems have one-second timestamps, so force the object, archives
    # and installed copy to rebuild in dependency order.
    touch -t 200001010000 "$build/libvpx/vpx_config.c.o" "$build/libvpx/libvpx_g.a" "$build/libvpx/libvpx.a" "$INSTALL_DIR/lib/libvpx.a"
    (cd "$build/libvpx" && emmake make -j4 install)
  fi
done
# A Git archive has no .git metadata. FFmpeg's version script otherwise embeds
# the RELEASE label instead of the short commit ID used by the checked build.
if [[ -n "${SCRAFT_FFMPEG_SOURCE_BUNDLE:-}" ]]; then
  export revision
  revision=$(python3 -c 'import json,sys; print(next(x["commit"][:7] for x in json.load(open(sys.argv[1]))["sources"] if x["name"] == "ffmpeg"))' "$lock")
fi
sed -E 's/ -j($|[[:space:]])/ -j4\1/g' "$build/wrapper/build/ffmpeg.sh" > "$build/scripts/ffmpeg.sh"
python3 - "$build/scripts/ffmpeg.sh" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text(); marker='emmake make -j4'
assert s.count(marker)==1
clean="python3 -c 'import os;from pathlib import Path;p=Path(\"config.h\");p.write_text(p.read_text().replace(os.environ[\"INSTALL_DIR\"],\"<build-prefix>\"))'"
p.write_text(s.replace(marker,clean+'\n'+marker))
PY
(cd "$build/ffmpeg" && bash "$build/scripts/ffmpeg.sh" --enable-gpl --enable-libx264 --enable-libvpx --enable-libmp3lame --enable-libvorbis --enable-libopus)
mkdir -p "$build/ffmpeg/src"
cp -R "$build/wrapper/src/bind" "$build/wrapper/src/fftools" "$build/ffmpeg/src/"
(cd "$build/ffmpeg" && bash "$build/wrapper/build/ffmpeg-wasm.sh" -lx264 -lvpx -lmp3lame -logg -lvorbis -lvorbisenc -lvorbisfile -lopus -sEXPORT_ES6 -o "$out/ffmpeg-core.js")
echo "Built $out/ffmpeg-core.js and $out/ffmpeg-core.wasm"
echo 'Compare their hashes to ffmpeg-core-source-lock.json; matching bytes are not guaranteed across all build hosts.'
