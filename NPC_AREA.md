# NPC position counts in a selected area

Click a map, or use its arrow keys, to select a circular area. The new panel
shows a table grouped by NPC ID: name, source level range, creature type and
number of unique coordinate records. Radius options are 2%, 5%, 10% and 20% of
map width, not metres. Distance uses both image dimensions, so the circle is
geometrically correct for non-square map artwork.

The panel reports matching records versus all unique records in the circle and
the number of distinct NPC IDs. Exact duplicates of (NPC ID, X, Y) count once;
different IDs at the same coordinate remain separate. There is no conversion of
estimated density indices into creature counts. Missing map coverage, empty
filter results, disabled NPC layer, load failures and map loading are explicit.
No numeric live population, respawn rate or hostility is inferred.

Existing name/ID, creature type, role and optional level-range filters apply.
Hide servicing NPCs excludes known trainer, vendor, repair, taxi, innkeeper,
banker, battlemaster, auctioneer and stable-master flags. A quest-giver flag alone
does not imply service exclusion or friendliness. Type labels retain their
preliminary Classic status; coordinates retain their QuestieDB Forever source.

## Overview and zoom

At overview zooms (100%, 150%), Auto grouping combines unique filtered positions
in screen regions at least 44 CSS pixels wide/high. Multi-record groups show
counts at region centres; singleton markers keep their source coordinates.
The grid prevents overlapping count bubbles. Counts describe source records,
not live creatures. At 200% and 300%, or with Individual positions selected,
the individual markers are displayed. Group membership may change with viewport
size; the total and the selected-area count do not.

The map viewport scrolls independently at higher zoom. The selected area is
centred after zoom or image loading. Image and overlay remain aligned. Orange
marks the selected area, separate from the existing 5%-cell density inspector.
Existing resource/trainer/NPC point inspection is retained alongside the table.

## State and accessibility

areaRadius, mapZoom, npcGrouping and hideServices persist in localStorage and
URLs. areaX/areaY are URL-only, validated as a complete pair in 0–100; they are
never restored from saved settings onto a different map. Changing zones or
clearing selection removes the old centre. Sharing a selected area reproduces
its centre, filters, radius and zoom. Arrow keys select the centre of a density
cell and pan to it at zoom; Escape clears both selections. The table has scoped
column headers and a keyboard-scrollable region. Layout is checked at 320px.

## Implementation and verification

npc-area.js contains pure deduplication, geometry, grouping and summary helpers.
npcs.js applies the optional servicing-flag filter; atlas.js manages rendering
and accessible state. No datasets, source coordinates or density cells change.

- tests/npc-area.cjs: inclusive circle boundary, aspect ratio, duplicates,
  distinct IDs at one coordinate, filter composition, cluster membership totals,
  URL validation and absence of stale saved centres.
- tests/npc-area-browser.cjs: independent pixel-distance count oracle, table
  totals, zoom invariance, visible restored centre, mobile scrolling/alignment,
  shared state, service filtering, keyboard selection and missing map coverage.
- Existing source/rebuild, resource, type, settings, Questie and 37-map layout
  regressions remain required. Pages staging includes both new client assets.
