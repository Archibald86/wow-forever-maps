# Stage 1: map alignment and corrected database v3.1

## Published changes

- Removed the atlas image minimum height that letterboxed terrain while
  stretching the canvas over the full element. Image and overlay now share
  their natural aspect ratio at all viewport widths.
- Constrained controls to narrow viewports, including the level slider and
  long zone names. Updated the shared stylesheet cache version to `3.1`.
- Added regression checks to the Pages workflow before publication:
  five coordinate tests, all 37 maps at widths 320/390/768/1440, reference
  points at 0/50/100%, horizontal overflow, and 16 layer combinations.

## Corrected archive

[WoW_Forever_Master_Database_v3.1_FIXED.zip](https://drive.google.com/file/d/1Mh40Q2iwwzsSCorUNkTq_ynPV8KOvE9o/view?usp=drivesdk)

SHA-256: `65686b6a5b31d323be11bcb1ee8362fc7eb0839954500b4e758f381aecd46e47`

This replaces the ore CSV and previews in the original Master Database v3.
The old file is preserved as historical evidence and marked invalid on Drive.
Its ore Y coordinates were incorrectly reduced to 0–0.9%.

v3.1 rebuilds all 3,943 imported ore coordinates from the original
`GatherMate2_Data/forever/MiningData.lua`, with the site's existing two-decimal
precision. Every rebuilt record agrees with the already-correct site data.
All 32 level-25 preview maps were regenerated. Mob cells, palette and coverage
audit are preserved; the source Lua, original format README and SHA-256
manifest are included in the new archive.

Rebuild from the repository root (requires Pillow for preview rendering):

```sh
python tools/rebuild_database.py --base-v3 /path/to/original-v3.zip \
  --gathermate /path/to/GatherMate2_Data.zip --site-root . \
  --output /path/to/WoW_Forever_Master_Database_v3.1_FIXED.zip
python -m unittest discover -s tests -v
```

For browser checks, install Playwright 1.62.1 and Chromium, serve the repository
with `python -m http.server 8765`, then run:

```sh
node tests/atlas-layout.cjs http://127.0.0.1:8765/
```

## Limits

This correction verifies coordinate decoding and browser overlay geometry.
In-game alignment, actual spawns and routes remain unverified. It does not
apply Era-to-Forever transformations or expand zone coverage. Those require
separate source and game checks. The site ore table itself was already
correct and has not been changed.
