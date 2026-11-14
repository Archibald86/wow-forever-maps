"""Rebuild the v3.1 ore table and level-25 previews from preserved inputs.

python tools/rebuild_database.py --base-v3 BASE.zip --gathermate SOURCE.zip \
    --site-root . --output WoW_Forever_Master_Database_v3.1_FIXED.zip

Only previews require Pillow (python -m pip install Pillow).
The source archive must contain GatherMate2_Data/forever/MiningData.lua.
Zone coverage is deliberately inherited from v3, not expanded here.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile


def decode_coordinate(key):
    """Decode GatherMate's XXXXYYYY00 format without mixing either axis."""
    value = int(key)
    if not 0 <= value < 10_000_000_000:
        raise ValueError('Coordinate must fit XXXXYYYY00')
    return value // 1_000_000 / 100, (value % 1_000_000) / 10_000


def parse_mining(text):
    zones = {}
    for match in re.finditer(r'\[(\d+)\]\s*=\s*\{(.*?)\n\s*\}', text, re.S):
        zone = int(match[1])
        if zone in zones:
            raise ValueError(f'Duplicate zone {zone}')
        zones[zone] = [(*decode_coordinate(key), int(kind)) for key, kind in
                       re.findall(r'\[(\d+)\]\s*=\s*(\d+)', match[2])]
    if not zones:
        raise ValueError('No mining zones found')
    return zones


def make_rows(coverage_text, source):
    rows = []
    coverage = csv.DictReader(io.StringIO(coverage_text.lstrip('\ufeff')))
    for item in coverage:
        if not item['zone_id']:
            continue
        zone_id = int(item['zone_id'])
        points = source.get(zone_id, [])
        if len(points) != int(item['ore_nodes']):
            raise ValueError(f"Source count changed for {item['map']}")
        # Match the site's documented two-decimal precision; raw keys remain
        # available in the preserved source (three keys include low-order flags).
        rows.extend(dict(map=item['map'], zone_id=zone_id, x_percent=round(x, 2),
                         y_percent=round(y, 2), node_type=kind) for x, y, kind in points)
    return rows


def render_preview(terrain_path, mob_rows, ore_rows, palette):
    from PIL import Image, ImageDraw, ImageFont
    terrain = Image.open(terrain_path).convert('RGB')
    width, height = terrain.size
    out = Image.new('RGB', (width, height + 75), '#111922')
    out.paste(terrain, (0, 75))
    pen = ImageDraw.Draw(out)
    font = ImageFont.load_default(size=14)
    pen.text((12, 8), f'{terrain_path.stem} | character level 25 | database v3.1',
             fill='white', font=font)
    pen.text((12, 29), 'Dots: estimated cell distribution; ore: historical GatherMate2 observations.',
             fill='#c7d3dc', font=font)
    pen.text((12, 49), 'Corrected coordinate decoding; in-game map alignment remains unverified.',
             fill='#c7d3dc', font=font)
    for index, (xp, yp, level, density) in enumerate(mob_rows):
        delta = level - 25
        color = (palette['provisional_grey_minus_eight_or_less'] if delta <= -8 else
                 palette['minus_five_to_minus_seven'] if delta <= -5 else
                 palette['five_plus'] if delta >= 5 else palette['relative_levels'][str(delta)])
        seed = ((index + 12345) * 1664525 + 1013904223) & 0xffffffff
        def random():
            nonlocal seed
            seed = (seed * 1664525 + 1013904223) & 0xffffffff
            return seed / 4294967296
        for _ in range(min(density, 800)):
            x = xp * width / 100 + 3 + random() * (width * .05 - 6)
            y = 75 + yp * height / 100 + 3 + random() * (height * .05 - 6)
            pen.ellipse((x-2, y-2, x+2, y+2), fill=color, outline='#17251b')
        pen.text((xp*width/100+width*.025, 75+yp*height/100+height*.025),
                 str(density), fill='white', stroke_width=2, stroke_fill='#15191e',
                 font=font, anchor='mm')
    for x, y, kind in ore_rows:
        x, y = x * width / 100, 75 + y * height / 100
        pen.ellipse((x-4.5, y-4.5, x+4.5, y+4.5),
                    fill='#82d9ff' if kind == 201 else '#ffc06b', outline='#1b252c', width=2)
    buffer = io.BytesIO()
    out.save(buffer, 'PNG')
    return buffer.getvalue()


def rebuild(base_path, source_path, site_root, output):
    with zipfile.ZipFile(base_path) as base, zipfile.ZipFile(source_path) as source:
        raw = source.read('GatherMate2_Data/forever/MiningData.lua')
        rows = make_rows(base.read('data/coverage_audit.csv').decode('utf-8-sig'),
                         parse_mining(raw.decode('utf-8-sig')))
        site = json.loads((site_root / 'data.json').read_text(encoding='utf-8'))
        expected = {m['id']: [] for m in site['maps']}
        for row in rows:
            expected[row['map']].append([row['x_percent'], row['y_percent'], row['node_type']])
        # Later site releases may add zones that v3 deliberately excluded.
        # Validate only the original v3 imported zones when rebuilding v3.1.
        original_coverage = csv.DictReader(io.StringIO(base.read('data/coverage_audit.csv').decode('utf-8-sig')))
        original_ids = [item['map'] for item in original_coverage if item['zone_id']]
        if any(expected[key] != site['ore'].get(key, []) for key in original_ids):
            raise ValueError('Rebuilt source table differs from the published site ore data')
        csv_buffer = io.StringIO(newline='')
        writer = csv.DictWriter(csv_buffer, fieldnames=['map','zone_id','x_percent','y_percent','node_type'])
        writer.writeheader()
        writer.writerows(rows)
        files = {name: base.read(name) for name in base.namelist()
                 if not name.startswith('maps/level25/') and name != 'README.md'}
        files['data/ore_nodes.csv'] = csv_buffer.getvalue().encode('utf-8-sig')
        files['sources/MiningData.lua'] = raw
        files['sources/GatherMate2_Data_README.md'] = source.read('GatherMate2_Data/README.md')
        palette = json.loads(files['data/palette.json'])
        preview_names = [n for n in base.namelist() if n.startswith('maps/level25/') and n.endswith('.png')]
        for name in preview_names:
            zone = Path(name).stem
            files[name] = render_preview(site_root/'maps'/(zone+'.jpg'),
                                         site['mobs'].get(zone, []), expected[zone], palette)
        files['README.md'] = ('''# WoW Forever Master Database v3.1 — corrected ore coordinates

Supersedes WoW_Forever_Master_Database_v3.zip. The original v3 archive has
incorrect ore coordinates: Y was decoded into 0–0.9%. Do not use its ore CSV
or rendered previews for import or navigation. Preserve it only as history.

## Corrected contents
- 3,943 historical ore records, decoded directly from forever/MiningData.lua.
- 32 regenerated character-level-25 previews using the corrected ore table.
- Original mob cell table, palette, and coverage audit preserved.
- MiningData.lua and its original format documentation included as provenance.
- MANIFEST.json records checksums for every payload file and both input ZIPs.

The CSV uses the same two-decimal precision as the already-correct site ore
data; unrounded source keys are preserved in MiningData.lua. Coverage is unchanged:
37 terrain maps on the site, mob data for 32 zones, and 3,943 imported ore
records. Missing zones are not silently treated as verified empty zones.

## Interpretation
Mob dots are reproducibly scattered within 5% cells, not verified individual
spawns. Density is an index, not a live mob count. Ore is historical addon
data, not a guarantee of a live node. Coordinate decoding is verified;
alignment of source coordinates with the actual Forever game remains unverified.
No Era-to-Forever transform was added in this correction.

## Rebuild
Use tools/rebuild_database.py in Archibald86/wow-forever-maps with the preserved
original v3 ZIP, original GatherMate2_Data ZIP, and a checkout of the site.
Pillow is needed only to render previews. The script checks every imported
record against site data and stops if the inputs change coverage or values.
''').encode()
        manifest = {'version':'3.1', 'supersedes':'WoW_Forever_Master_Database_v3.zip',
                    'ore_records':len(rows), 'previews':len(preview_names),
                    'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()
                               for p in [base_path, source_path]},
                    'files':{n:hashlib.sha256(b).hexdigest() for n,b in sorted(files.items())}}
        files['MANIFEST.json'] = json.dumps(manifest, indent=2).encode()
        with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for name, content in sorted(files.items()):
                info = zipfile.ZipInfo(name, (2026,11,14,0,0,0))
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, content)
        return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-v3', type=Path, required=True)
    parser.add_argument('--gathermate', type=Path, required=True)
    parser.add_argument('--site-root', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(rebuild(args.base_v3, args.gathermate, args.site_root, args.output), indent=2))
