# QuestieDB Forever: source, attribution and terms

Source: https://github.com/Questie/QuestieDB
Commit: 4dbb82440a27856f8dccf57094a5d792cdc7cc9b
Retrieved: 2026-11-15. Credit: QuestieDB, Questie and their contributors.

The documented offline export was run with --include-authored: Forever baseline,
legacy corrections already converted to Forever, generated corrections, traces,
then authored static corrections. No raw Classic Era import or additional
coordinate conversion. Russian lookup names apply base then trace lookups, with
English fallback. Original tables and lookups: tables.json.gz. Field legends,
upstream SHA-256 values and exact source: provenance.json.

## Licensing

Upstream LICENSE.md, PROVENANCE.md and gpl-3.0.md are preserved verbatim here.
Licensing is NOT uniformly GPLv3. Individual-file and subdirectory notices have
priority. Upstream describes unresolved historical contributor rights: its team
consents to copying/forking under GPLv3 but cannot speak for all historic authors.
This notice does not replace those terms or resolve historical rights. Questie
name/logo rights are not granted; no branding assets are included.

## Limits

Coordinates are static source records, not simultaneous live creatures. NPC pins
are separate from existing estimated density cells. Only direct canonical AreaID
to UiMapID mappings are used. Missing coordinates do not prove a zone empty.
Unknown/debug/test/unused rows remain in the catalog but not map pins. Duplicate
NPC/coordinate tuples are removed. Map alignment and in-game availability remain
unverified. No character-specific dynamic corrections, derived passes, live phase
filtering, drop probabilities or verified health. Deprecated health fields are
omitted from searchable catalogs; original values remain in the gzip source.

## Rebuild and update

python tools/build_data.py rebuilds from locked gzip input using Python stdlib.
--check verifies all input hashes and export bytes. To intentionally refresh:
check out QuestieDB at the desired commit; run tools/export-forever.lua with
--include-authored; run this project's tools/export_questie.lua from that checkout
using Lua 5.1 and capture stdout JSON. Gzip with mtime=0; refresh field legends,
upstream SHA-256 values, license/provenance copies and build_inputs.json. Run the
importer tests and browser regressions before publishing.
