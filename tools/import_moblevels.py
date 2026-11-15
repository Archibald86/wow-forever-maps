"""Validate pinned factual Mob Level Map cells against the normalized CSV export."""
import csv
import gzip
import json


def prepare(source, zones):
    folder = source/'moblevels'
    meta = json.loads((folder/'provenance.json').read_text(encoding='utf-8'))
    names = json.loads((folder/'zone_names.json').read_text(encoding='utf-8'))
    tables = json.loads(gzip.decompress((folder/'tables.json.gz').read_bytes()))
    ids = [zone['id'] for zone in zones]
    if set(names) != set(ids) or meta['version'] != '1.0.7' or meta['grid_size'] != 20:
        raise ValueError('Invalid mob source mappings/version')
    expected = []
    mobs, origins, coverage = {}, {}, {}
    for key in ids:
        mobs[key], origins[key], seen = [], [], set()
        for record in tables.get(names[key], []):
            if not isinstance(record,list) or len(record) != 5:
                raise ValueError('Invalid mob source row')
            x,y,level,density,kind = record
            if (not all(type(v) is int for v in [x,y,level,density]) or
                not (1 <= x <= 20 and 1 <= y <= 20 and 1 <= level <= 63 and 1 <= density <= 50) or
                kind not in ['classic_reference','forever_override'] or (x,y) in seen):
                raise ValueError('Invalid/duplicate mob source cell '+key)
            seen.add((x,y))
            mobs[key].append([(x-1)*5,(y-1)*5,level,density])
            origins[key].append(kind)
            expected.append([key,names[key],str(x),str(y),str(level),str(density),str((x-1)*5),str((y-1)*5),kind,meta['version']])
        coverage[key] = {'source':'Mob Level Map','source_version':meta['version'],
                         'classic_reference_cells':origins[key].count('classic_reference'),
                         'forever_override_cells':origins[key].count('forever_override'),
                         'level_kind':'representative_level','live_population_verified':False,
                         'coordinate_alignment':'unverified'}
    with (source/'mob_cells.csv').open(encoding='utf-8-sig',newline='') as file:
        reader = csv.reader(file)
        if next(reader) != ['map','zone_en','cell_x','cell_y','mob_level','density_index','x_from_pct','y_from_pct','source_kind','source_version'] or list(reader) != expected:
            raise ValueError('Mob CSV does not match pinned source tables')
    return mobs, origins, coverage, meta
