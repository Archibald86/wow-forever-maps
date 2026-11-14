# Creature-type reference: attribution, terms and limits

Source: https://www.wowforeverfriends.org/library/data/npcs.json
Source documentation: https://www.wowforeverfriends.org/library/sources/
Attribution: WoW Forever Friends; CMaNGOS Classic-DB contributors.
Upstream: https://github.com/cmangos/classic-db

This is a Classic 1.12 community database reference, NOT an observation or
verification of current WoW Forever creature types. The source labels these
records classic-baseline. No value is inferred from the creature name, service
role, rank, faction, race or family. The source has 7,431 NPC IDs matching the
pinned QuestieDB Forever catalog; 7,146 have a specific supported type, 284 are
Unspecified and one is Other. Unspecified/Other and IDs absent from this source
remain unknown. Three changed names are explicitly flagged for review.

The downloaded original JSON is preserved byte for byte after gzip decompression
in classic_npcs.json.gz; provenance.json records its SHA-256, retrieval timestamp,
source and upstream. upstream_provenance.json is the source publisher's retained
provenance, including the upstream snapshot SHA-256. LICENSE.md is the source
publisher's verbatim license. Its source documentation distributes the structured
data under GPL-3.0. No claim is made that this license covers other site data.

Our modifications: match only exact NPC IDs; retain the original source type,
name and family; map nine specific creature types to canonical English keys and
Russian display labels; mark all such types classic_reference and not verified
in Forever; keep unknowns explicit; flag differing English names. Family, rank
and service role remain separate from creature type. Coordinates, levels, loot,
health and other Classic fields from this snapshot are NOT imported into the
atlas or used for recommendations. Their presence in the preserved source file
does not make them verified game data.

Implementation: tools/import_creature_types.py and tools/import_questie.py.
A clean Python-standard-library build uses only locked sources and no network:
python tools/build_data.py --check
