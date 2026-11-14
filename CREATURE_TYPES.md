# Creature types for the NPC atlas and catalog

The NPC layer and database now have a type filter, independently of service
role, family, rank, level and name/ID. Nine specific types have Russian labels:
Humanoid, Beast, Undead, Demon, Elemental, Dragonkin, Giant, Mechanical, Critter.
The Unknown option includes absent, Unspecified and Other records.

## Source and status

WoW Forever Friends' downloadable NPC snapshot, adapted from CMaNGOS Classic-DB:
https://www.wowforeverfriends.org/library/sources/

This is a Classic 1.12 reference, not verified Forever evidence. All imported
specific types have status classic_reference; none is marked Forever verified.
The full original JSON is preserved in sources/creature_types/classic_npcs.json.gz.
SHA-256, source timestamp, upstream provenance, GPL-3.0 text and attribution are
pinned beside it. See sources/creature_types/NOTICE.md. Original source SHA-256:
5c5a4524a3ad6a25c20902291d244baf32bb5f6b33c65c35847c7f5e1dcfb5f1.

- 7,431 matching NPC IDs in the 15,564-entry QuestieDB Forever catalog.
- 7,146 specific reference types; 8,418 unknown types in the full catalog.
- Source Unspecified (284) and Other (1) remain unknown.
- 4,451 of the 6,335 NPC entities on atlas maps have a reference type.
- 1,884 map entities remain unknown, including the new Al'Aketh Ambusher 251451.
- 3 differing names are flagged, not silently treated as confirmed equivalence.

Matching is by exact ID only. No type is inferred from a name, faction, race,
rank, service or family. No Classic coordinates, combat values, health, timers
or loot probabilities are imported from this snapshot into the atlas/catalog.
Creature classifications are separate metadata from the original Questie fields.

## Interface and sharing

Atlas: npcType URL/localStorage setting combines with npcRole, npcQuery and the
existing optional level-range filter. Type/source status appears in point details
and hover labels. Database: NPC type filter combines with name or exact ID,
resets pagination, persists in the URL, and is hidden for non-NPC catalogs.
Links from a specific NPC catalog card to its map explicitly reset npcType=all
so an older saved type cannot hide the chosen NPC. Known types are always labelled
preliminary Classic; source/unknown/name-change explanations are visible.

## Build and validation

NPC atlas schema is now 2; loaders validate classification status and reject
missing/inconsistent type metadata. Catalog schema remains 1 with an additive
creature metadata field. NPC payload and client asset query versions are bumped.

python tools/build_data.py --check
python -m unittest discover -s tests
node tests/creature-types.cjs
node tests/creature-types-browser.cjs http://127.0.0.1:8765/

Tests cover source counts, exact joins, unknowns, changed names, catalog/map parity,
independent family/role semantics, filter combinations, URL restore, map links,
320px layout and source labels. Existing Questie, resource, settings, density and
37-map layout regressions remain required in the Pages workflow. Pages staging
includes creature-types.js and the source/attribution folder.
