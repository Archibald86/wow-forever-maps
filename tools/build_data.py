"""Build all data exports from pinned source files, without an existing data.json.

python tools/build_data.py             # rebuild committed exports
python tools/build_data.py --check     # fail on changed inputs or stale exports
python tools/build_data.py --output /tmp/wow-data
Uses only the Python standard library. No network or external archives needed.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

from import_resources import import_resources
from import_questie import prepare as prepare_questie

ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ['data.json','data.js','coverage.json','sources/resource_import_manifest.json']


def build(root=ROOT):
    source = root/'sources'
    lock = json.loads((source/'build_inputs.json').read_text(encoding='utf-8'))
    for name, expected in lock['files'].items():
        if hashlib.sha256((source/name).read_bytes()).hexdigest() != expected:
            raise ValueError('Pinned source changed: '+name)
    zones = json.loads((source/'zones.json').read_text(encoding='utf-8'))
    ids = [zone['id'] for zone in zones]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate map ID')
    mobs = {key:[] for key in ids}
    occupied = set()
    with (source/'mob_cells.csv').open(encoding='utf-8-sig',newline='') as file:
        for row in csv.DictReader(file):
            key = row['map']
            x,y = float(row['x_from_pct']),float(row['y_from_pct'])
            level,density = int(row['mob_level']),int(row['density_index'])
            if key not in mobs or not (0 <= x <= 95 and 0 <= y <= 95) or x%5 or y%5 or not (1 <= level <= 100) or density < 0:
                raise ValueError('Invalid mob cell')
            cell = (key,x,y)
            if cell in occupied:
                raise ValueError('Duplicate mob cell '+str(cell))
            occupied.add(cell)
            mobs[key].append([x,y,level,density])
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory)
        (target/'sources').mkdir()
        shutil.copyfile(source/'zone_mapping.json',target/'sources/zone_mapping.json')
        (target/'data.json').write_text(json.dumps({'maps':zones,'mobs':mobs}),encoding='utf-8')
        import_resources(source/'gathermate',target)
        data_path = target/'data.json'
        data = json.loads(data_path.read_text(encoding='utf-8'))
        data['schema_version'] = 3
        data['catalog'] = json.loads((source/'resource_catalog.json').read_text(encoding='utf-8'))
        data['trainers'] = {key:[] for key in ids}
        for trainer in json.loads((source/'trainers.json').read_text(encoding='utf-8')):
            if trainer['zone'] not in data['trainers'] or not (0 <= trainer['x'] <= 100 and 0 <= trainer['y'] <= 100):
                raise ValueError('Invalid trainer position')
            data['trainers'][trainer['zone']].append(trainer)
        for key in ids:
            data['coverage'][key]['trainers'] = {'status':'guide_list' if data['trainers'][key] else 'no_guide_records',
                'records':len(data['trainers'][key]),'coordinate_alignment':'unverified','complete':False}
        questie_exports, questie_summary = prepare_questie(source,zones)
        data['questie'] = {k:questie_summary[k] for k in ['source','commit','counts']}
        for key in ids:
            data['coverage'][key]['npcs'] = questie_summary['coverage'][key]
        (target/'coverage.json').write_text(json.dumps(data['coverage'],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        for layer in ['ore','herbs']:
            for points in data[layer].values():
                for point in points:
                    info = data['catalog'].get(str(point[2]))
                    if not info or info['kind'] != layer:
                        raise ValueError('Unmapped resource type')
        text = json.dumps(data,ensure_ascii=False,separators=(',',':'))
        data_path.write_text(text+'\n',encoding='utf-8')
        (target/'data.js').write_text('window.WOW_DATA='+text+';\n',encoding='utf-8')
        result = {name:(target/name).read_bytes() for name in EXPORTS}
        result.update(questie_exports)
    manifest = {'version':1, 'inputs':lock['files'], 'exports':{
        name:hashlib.sha256(content).hexdigest() for name,content in result.items()}}
    result['sources/build_manifest.json'] = (json.dumps(manifest,indent=2)+'\n').encode()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--output',type=Path,default=ROOT)
    args = parser.parse_args()
    result = build()
    if args.check:
        stale = [name for name,content in result.items()
                 if not (args.output/name).is_file() or (args.output/name).read_bytes()!=content]
        if stale:
            raise SystemExit('Stale exports: '+', '.join(stale))
        print('PASS: pinned sources and all generated exports match byte for byte')
    else:
        for name,content in result.items():
            path = args.output/name
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(content)
        print('Built',len(result),'data exports from pinned sources')


if __name__ == '__main__':
    main()
