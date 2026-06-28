# Bundled LADSPA plugins (TAP-plugins)

This folder ships LADSPA audio plugins with the app. The portal server adds it to
`LADSPA_PATH` automatically for every FFmpeg call (see `ffmpegEnv()` in
`src/server/app.js`), so any `*.dll` placed here is discoverable with **no `.env`
edits and no full paths** — just the plain plugin name (e.g. `tap_reverb`).

It contains the TAP-plugins (Tom's Audio Processing) source + `ladspa.h` so the
plugins can be rebuilt in place and travel with the repo.

## Build the DLLs (one-time, needs a 64-bit MinGW gcc)

FFmpeg here is **x86-64**, so the DLLs must be 64-bit too.

1. Install a 64-bit MinGW-w64 toolchain:
   - w64devkit (portable): https://github.com/skeeto/w64devkit/releases — unzip, run `w64devkit.exe`
   - or MSYS2: open the **MINGW64** shell, `pacman -S mingw-w64-x86_64-gcc`
2. From a shell where `gcc` is on PATH:
   ```
   cd resources/ladspa
   sh build-win.sh
   ```
   This produces `tap_*.dll` right here. Restart the portal server so it picks them up.

## Use in the Voice FX panel

1. Turn on **Apply FFmpeg**.
2. Pick a plugin from the **TAP Plugin** dropdown (Library stays the plain name).
3. Click **Load controls** to pull the plugin's real parameters as sliders.
4. **Test**.

## License

TAP-plugins © Tom Szilagyi, GPL v2+ (see `COPYING`). `ladspa.h` is the LADSPA SDK
header (LGPL). These are bundled as source; built DLLs are derivative works under
the same terms.
