#!/usr/bin/env bash
#
# Build TAP-plugins as 64-bit Windows LADSPA DLLs (for use with FFmpeg's
# `ladspa` filter / the Portal App Voice FX panel).
#
# Requirements: a 64-bit MinGW-w64 gcc on PATH. Easiest options:
#   - w64devkit  : https://github.com/skeeto/w64devkit/releases  (portable zip)
#   - MSYS2      : install, then `pacman -S mingw-w64-x86_64-gcc`
#
# Then, from a shell where `gcc` is on PATH:
#   bash build-win.sh
#
# The Linux Makefile flags (-lrt, -Bsymbolic, -nostartfiles) are intentionally
# NOT used: on Windows we must keep the CRT startup so the plugins'
# __attribute__((constructor)) init runs when the DLL loads.

set -u
cd "$(dirname "$0")"

CC="${CC:-gcc}"
if ! command -v "$CC" >/dev/null 2>&1; then
  echo "ERROR: no C compiler found ('$CC')."
  echo "Install a 64-bit MinGW-w64 toolchain (w64devkit or MSYS2's mingw-w64-x86_64-gcc),"
  echo "make sure gcc is on PATH, then re-run: bash build-win.sh"
  exit 1
fi

MACH="$("$CC" -dumpmachine 2>/dev/null || echo unknown)"
echo "Compiler: $CC  ($MACH)"
case "$MACH" in
  x86_64-*) ;;
  *) echo "WARNING: '$MACH' does not look 64-bit. FFmpeg here is x86-64; the DLLs MUST be x86-64 too or they will 'Failed to load'." ;;
esac

if [ ! -f ladspa.h ]; then
  echo "ladspa.h missing — fetching canonical header..."
  curl -fsSL https://raw.githubusercontent.com/swh/ladspa/master/ladspa.h -o ladspa.h \
    || { echo "ERROR: could not fetch ladspa.h. Place it in this folder and re-run."; exit 1; }
fi

CFLAGS="-O3 -ffast-math -funroll-loops -fomit-frame-pointer -I."
ok=0; fail=0
for src in tap_*.c; do
  [ -e "$src" ] || continue
  out="${src%.c}.dll"
  if "$CC" $CFLAGS -shared -o "$out" "$src" -lm 2>./build_err.log; then
    echo "  built  $out"; ok=$((ok + 1))
  else
    echo "  FAILED $src"; sed 's/^/      /' ./build_err.log | head -6; fail=$((fail + 1))
  fi
done

echo
echo "Done: $ok built, $fail failed."
if [ "$ok" -gt 0 ]; then
  echo "These DLLs live in the app's bundled resources/ladspa folder, which the"
  echo "server adds to LADSPA_PATH automatically — no .env or full paths needed."
  echo "In the Voice FX panel: turn on 'Apply FFmpeg', pick a TAP plugin (Library"
  echo "stays the plain name, e.g. tap_reverb), click 'Load controls', then Test."
  echo "Restart the portal server after a fresh build so it picks up new DLLs."
fi
