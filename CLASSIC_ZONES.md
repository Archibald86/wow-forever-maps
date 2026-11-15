# Five Classic outdoor zones added

The atlas now has 42 maps. Added Alterac Mountains (1416 / Area 36), Badlands
(1418 / Area 3), Redridge Mountains (1433 / Area 44), Mulgore (1412 / Area 215),
and Arathi Highlands (1417 / Area 45). Display names are Russian; the selector
continues to sort by displayed name. No additional Forever zones, cities or
battlegrounds were added.

## Sources and limits

Resource observations come from the existing pinned GatherMate2 Forever files.
NPC records use the existing QuestieDB Forever snapshot and canonical AreaIDs,
with the same coordinate validation, deduplication and service/debug exclusions.
The five maps add 948 ore records, 1,326 herb records and 11,768 unique NPC
coordinate records. These are source positions, not simultaneous live counts.
Estimated mob density and the curated trainer layer have no new records; those
gaps remain explicit.

The background JPEGs are WoW Classic reference maps from the Wowhead CDN. Exact
URLs, dimensions and hashes are in sources/classic_map_artwork.json. They are
kept at their native size and aspect ratio; they may omit Forever terrain
changes. This limitation is displayed in the map coverage text. No in-game
alignment is asserted. Map artwork remains the property of its respective
rightsholders; downloading it does not grant a separate redistribution license.

GatherMate IDs 218 (Lesser Bloodstone Deposit, Mining 75) and 416 (Wintersbite,
Herbalism 195) are now used by these zones. Names come from the already pinned
GatherMate constants and Russian locale; skill references are recorded in the
resource catalog. The catalog now contains 44 resource types.

All five artworks were visually reviewed, with enlarged template candidates.
23 additional rock-arch cave glyphs were circled. Camp/tent symbols, towers,
mountain peaks and frame artefacts were excluded. The existing 133 annotations
are unchanged; the total is 156 on 40 of the 42 maps.

## Validation

The standard-library build regenerates the pinned exports. Existing source
coordinate, classification, layout, cave ring and browser regressions cover
the expanded map set, including the differing image dimensions.

Subsequent density update: all five added zones now have sourced estimated density cells. See DENSITY_UPDATE.md for current coverage and provenance.
