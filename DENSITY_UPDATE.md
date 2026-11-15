# Density update and newly uploaded source audit — 2026-11-15

The atlas keeps all 42 maps and its alphabetical selector. The density layer now
contains 4,953 cells on 40 maps: 887 additions and 71 changed existing records.
No cells were removed. NPC positions, resource records, trainers, map JPEGs and
all 156 cave annotations are byte-for-byte or record-for-record unchanged.

## Input inspection

All 19 newly uploaded files in the user's WOW folder were downloaded. ZIP CRCs
passed; file sizes and all 16 supplied inventory SHA-256 hashes matched. The
uploaded `wow_forever_ore_moblevels_v2.zip` contains the same 4,066-row density
CSV as the previous site. All 37 JPEGs in `wow_forever_relevant_explored_maps.zip`
match existing artwork exactly. The flattened ore/level previews are not clean
backgrounds; reconstruction/audit CSVs do not constitute NPC population records.
The historical missing-files list is preserved as an inventory reference, not
interpreted as evidence that those files are still unavailable today.

No source archive, private Drive URL or file ID was published. The public
`sources/drive_import_2026-11-15.json` records filenames, hashes and decisions.

| New file | ZIP entries | Import decision |
|---|---:|---|
| wow_forever_v2_coordinate_audit.csv | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |
| wow_forever_relevant_zone_audit.csv | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |
| wow_forever_relevant_explored_maps.zip | 38 | existing selected artwork; no replacement needed |
| wow_forever_ore_moblevels_v2.zip | 67 | density CSV duplicates the previous site source; no new density cells |
| wow_forever_illustrated_ore_maps_v1.zip | 36 | flattened resource overlays / previews, not clean interactive atlas backgrounds; kept as comparison sources |
| wow_forever_explored_maps_cleaned_50.zip | 51 | map variants and reconstruction sources; no verified improvement over current clean artwork; retained as source references |
| wow_forever_explored_batch_01.zip | 6 | map variants and reconstruction sources; no verified improvement over current clean artwork; retained as source references |
| wow_forever_all_explored_maps.zip | 52 | map variants and reconstruction sources; no verified improvement over current clean artwork; retained as source references |
| wow_forever_51_terrain_ore_maps_FIXED.zip | 52 | flattened resource overlays / previews, not clean interactive atlas backgrounds; kept as comparison sources |
| wow_forever_51_terrain_ore_maps.zip | 52 | flattened resource overlays / previews, not clean interactive atlas backgrounds; kept as comparison sources |
| wow_forever_3_fully_explored_maps.zip | 4 | map variants and reconstruction sources; no verified improvement over current clean artwork; retained as source references |
| mapfix_openmap_reveal_coordinates.csv | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |
| mapfix_explored_quality_audit.csv | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |
| mapenh_base_maps_52.zip | 50 | map variants and reconstruction sources; no verified improvement over current clean artwork; retained as source references |
| clearmap_all_zones_manifest.csv | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |
| clearmap_all_51_zones_png.zip | 53 | map variants and reconstruction sources; no verified improvement over current clean artwork; retained as source references |
| README.md | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |
| missing_files.json | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |
| inventory.json | — | inventory, missing-file list, or coordinate/quality audit; provenance reference, not spawn or population measurements |

## Actual density update source

The additional data comes from the independently checked Mob Level Map 1.0.7,
released 2026-11-14, rather than from an assumed newer timestamp on an old export:
https://www.curseforge.com/wow/addons/mob-levels/files/9605623

Numeric table values were extracted without running addon code. Continent base
tables are followed by ForeverOverrides, keyed by zone name and 1-based grid
cell; later cells replace earlier values. The pack preserves 215 active Forever
override cells separately from 4,738 Classic Era reference cells. Removing an
obsolete override can correctly return a cell to the Classic reference value.
The source tables include Riverglades and Gol'Bolar Quarry Mine; neither is
mapped onto an atlas zone by guessing coordinates. No additional maps were added.

| Previously empty map | New cells |
|---|---:|
| Alterac Mountains | 130 |
| Arathi Highlands | 110 |
| Badlands | 160 |
| Redridge Mountains | 169 |
| Mulgore | 99 |
| Deadwind Pass | 56 |
| Teldrassil | 76 |
| Zephras Isle | 61 |

These eight maps add 861 cells; another 26 are additions on previously populated
maps. Of the 71 changed cells, 63 affect only the representative level and eight
affect the index. Moonglade and Darkspear Islands remain explicit source gaps.

## Provenance and interpretation

`sources/mob_cells.csv` now includes source_kind and source_version. Its values
must exactly agree with the independently pinned normalized numeric source pack
in sources/moblevels. The standard-library importer rejects duplicate cells,
invalid ranges, unknown origins, bad mappings and a disagreeing CSV. All source
hashes are locked in sources/build_inputs.json. Rebuilds need no network.

The selected-cell panel identifies Classic reference versus Forever correction
and version 1.0.7. Coverage metadata records counts for both origins, and the
page links the source and NOTICE. The index remains an estimate, not a live
population count; the level represents a cell, not every creature in it.
Source terms and limits are stated in sources/moblevels/NOTICE.md. The addon is
marked All Rights Reserved; no blanket GPL/MIT license is claimed. No Lua code,
textures, or copied XP weighting model was added to the repository.

## Verification

The reproducible build, source/CSV validation, existing Python and JavaScript
regressions and full browser suite cover the update. New browser coverage checks
all eight filled zones, their recommendation eligibility, an audited Barrens
level correction, both source labels, explicit remaining gaps and mobile layout.
The existing layout check tests 42 maps at four widths (168 geometry checks).
Loaders and script fallbacks have a new data version to avoid cached old exports.
