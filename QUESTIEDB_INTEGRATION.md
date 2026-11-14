# QuestieDB Forever integration — 2026-11-15

Upstream commit: `4dbb82440a27856f8dccf57094a5d792cdc7cc9b`.
The documented exporter with `--include-authored` and this project's Lua adapter
produced pinned static source tables, ruRU lookup tables and the canonical
UiMapID-to-AreaID mapping. SHA-256 and field legends: sources/questie/provenance.json.
Attribution and mixed historical licensing: sources/questie/NOTICE.md.

## User-facing changes

- Optional NPC layer on atlas.html, fetched only when enabled (3 MB JSON).
- Filters by exact numeric ID, Russian/English name, quest involvement, vendor
  or trainer flags. Existing −2…0 level filter uses the NPC level range.
- Coordinates, names, levels, quest start/end IDs and source snapshot in the
  accessible point inspector; links to the full catalog.
- Shareable/saved NPC settings; load errors have a dedicated retry and preserve
  the existing resource/density layers.
- database.html searches 15,564 NPCs, 5,914 quests, 23,862 items and 7,289 objects.
  It loads only the selected catalog (roughly 2–7 MB); paginates 40 records; uses
  ruRU names with enUS fallback and Russian quest text where available.
- Catalog links connect NPCs, quests, items and objects by ID. NPC coordinate
  links open the matching existing map with the exact NPC filter. Object links
  open the zone terrain; an object overlay is not claimed.
- Expandable source fields and direct JSON links retain source relationships.
  Deprecated NPC health fields are excluded from catalog presentation.

## Coverage and meaning

94,535 NPC coordinate tuples on 36 of 37 maps. 192 service/test/unknown NPC
entities excluded from map display, 14 exact tuple duplicates removed, no invalid
coordinates encountered. All 15,564 entity IDs remain searchable.

Direct canonical AreaID matches only: no Era coordinate transform, descendant
area reassignment or guessed location. The four previously missing zones
Deadwind Pass, Moonglade, Teldrassil and Zephras Isle have NPC source coordinates.
Darkspear Islands remains no_source_records. Source records are not verified
live spawns, hostile mobs, population density or faction/phase availability.
Character-specific dynamic corrections and derived passes are not applied.

Existing 4,066 estimated mob cells, 4,511 ore points, 9,319 herb points, 42 resource
catalog entries and 35 guide trainers are preserved. NPC coordinates neither
replace density nor alter farm ranking. Coverage is tracked separately per map.

## Rebuild and validation

`python tools/build_data.py --check` verifies all pinned inputs and 12 exports.
A clean source-only rebuild needs Python's standard library and no network/Lua.
Lua 5.1 and the pinned upstream checkout are needed only for a deliberate refresh.

- Python source-coordinate/uniqueness/coverage, catalog IDs/localization,
  service filtering and original data preservation checks.
- JS validation and exact-ID/name/role/level filter checks.
- Browser tests/questie.cjs: lazy loading; point details; URL restoration; missing
  zone; all four catalogs; mobile overflow; failure and retry.
- Existing core/settings/resource tests and stage4 browser regressions.
- Existing layout sweep: 37 maps × 4 widths; 128 layer combinations; both density modes.

Use an HTTP server or GitHub Pages for the database page. Direct file:// opening
of the atlas retains the optional npc-atlas.js fallback.
