"""Import historical resource observations for the atlas's existing maps.

python tools/import_resources.py --source GatherMate2_Data.zip --site-root .
No coordinate-frame transform or claims of in-game verification are made.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile
from contextlib import contextmanager

from rebuild_database import parse_mining


@contextmanager
def resource_source(source_path):
    if source_path.is_dir():
        lock = json.loads((source_path.parent/'build_inputs.json').read_text(encoding='utf-8'))
        files = {}
        for filename in ['MiningData.lua','HerbalismData.lua']:
            raw = (source_path/filename).read_bytes()
            if hashlib.sha256(raw).hexdigest() != lock['files']['gathermate/'+filename]:
                raise ValueError('Source checksum mismatch: '+filename)
            files['GatherMate2_Data/forever/'+filename] = raw
        yield lock['resource_archive_sha256'], files
    else:
        with zipfile.ZipFile(source_path) as archive:
            yield hashlib.sha256(source_path.read_bytes()).hexdigest(), archive


def import_resources(source_path, root):
    data_path = root/'data.json'
    data = json.loads(data_path.read_text(encoding='utf-8'))
    mapping = json.loads((root/'sources/zone_mapping.json').read_text(encoding='utf-8'))
    coverage = {}
    with resource_source(source_path) as (source_hash, archive):
        sources = {}
        for layer, filename in [('ore','MiningData.lua'), ('herbs','HerbalismData.lua')]:
            name = 'GatherMate2_Data/forever/' + filename
            raw = archive[name] if isinstance(archive,dict) else archive.read(name)
            parsed = parse_mining(raw.decode('utf-8-sig'))
            sources[layer] = {'archive_sha256':source_hash, 'path':name,
                              'sha256':hashlib.sha256(raw).hexdigest(),
                              'game_flavor':'Forever', 'kind':'historical_observations',
                              'coordinate_alignment':'unverified', 'precision_decimals':2}
            data[layer] = {}
            for zone in data['maps']:
                key = zone['id']
                ui_map = mapping['zones'][key]
                points = [[round(x,2),round(y,2),kind] for x,y,kind in parsed.get(ui_map,[])]
                if any(not (0 <= x <= 100 and 0 <= y <= 100) for x,y,_ in points):
                    raise ValueError('Out-of-range coordinates for '+key)
                data[layer][key] = points
                zone[layer[:-1]+'_count' if layer == 'herbs' else 'ore_count'] = len(points)
                zone['ui_map_id'] = ui_map
                item = coverage.setdefault(key, {'name':zone['name'],'ui_map_id':ui_map})
                item[layer] = {'status':'imported' if points else 'no_source_records',
                               'records':len(points), 'source_path':name,
                               'coordinate_alignment':'unverified'}
            sources[layer]['unmapped_source_zones'] = [
                {'ui_map_id':key,'records':len(value)} for key,value in parsed.items()
                if key not in mapping['zones'].values()]
        for zone in data['maps']:
            data['mobs'].setdefault(zone['id'], [])
            records = len(data['mobs'].get(zone['id'],[]))
            zone['has_mobs'] = bool(records)
            coverage[zone['id']]['mobs'] = {'status':'available' if records else 'missing',
                                           'cells':records, 'kind':'estimated_cells'}
    data.update(schema_version=2, sources=sources, coverage=coverage)
    text = json.dumps(data, ensure_ascii=False, separators=(',',':'))
    data_path.write_text(text+'\n', encoding='utf-8')
    (root/'data.js').write_text('window.WOW_DATA='+text+';\n', encoding='utf-8')
    (root/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest = {'source_archive_sha256':source_hash, 'records':{}}
    for layer in ['ore','herbs']:
        manifest['records'][layer] = {
            key:{'count':len(rows),'sha256':hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest()}
            for key,rows in data[layer].items()}
    (root/'sources/resource_import_manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return {key:sum(len(rows) for rows in data[key].values()) for key in ['ore','herbs']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--site-root',type=Path,required=True)
    args = parser.parse_args()
    print(json.dumps(import_resources(args.source,args.site_root)))
