# Cave glyphs outlined in red

All 42 terrain maps were visually reviewed at full size and with enlarged crops.
156 visible cave-mouth glyphs were annotated on 40 maps. No matching glyphs were
found on the Darkspear Islands or Moonglade artwork. This records visible map
symbols, not an exhaustive inventory of real in-game caves or verified entrances.

## Method and provenance

A template-assisted image search proposed candidates. Candidates were checked
visually against the rock-arch symbol, including different colour/shape variants
and symbols partly blended into mountain ridges. Mountain peaks, gates, towers,
coastline artefacts and map-frame matches were rejected. The final list is curated;
no image-recognition library is needed to build or run the site.

sources/cave_icons.json stores every reviewed map, including empty results, its
original JPEG SHA-256 and dimensions, and integer source-image pixel coordinates
plus circle radius. No Era/Forever world-coordinate conversion is performed.
Original JPEG files are unchanged. The existing source records, NPC layers,
resource layers, density estimates and area counts are unchanged.

## Display

The Caves checkbox is enabled by default and persists in saved settings and URLs
(caves=1 or caves=0). A separate canvas draws unfilled red circles with a light
halo above the other atlas layers. Rings scale with the terrain and retain a
small readable minimum radius on narrow screens. They do not intercept pointer
or keyboard interactions. Map changes/loading errors clear the previous rings.
The legend and per-map status identify the circles as terrain-artwork symbols.
If annotations are unavailable or dimensions differ, the layer reports that
instead of drawing guessed positions.

## Build and checks

python tools/build_data.py --check
node tests/caves.cjs
node tests/caves-browser.cjs http://127.0.0.1:8765/

The standard-library build validates all 42 map audit records and emits
cave-icons.json and cave-icons.js from the pinned source. Tests verify exact
artwork hashes, JS/JSON parity, coordinate bounds, duplicates, the 156-symbol
inventory, actual red pixels at every marker, the saved toggle and alignment
at mobile width and 300% zoom. Existing atlas/source/spatial regressions remain
required. Pages staging includes the annotation payloads and renderer.
