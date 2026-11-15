"""Export manually reviewed cave-glyph annotations; no image processing at build time."""
import json
import re


def prepare_caves(source,zones):
    data=json.loads((source/'cave_icons.json').read_text(encoding='utf-8'))
    if data.get('schema_version')!=1 or set(data['maps'])!={z['id'] for z in zones}:
        raise ValueError('Incomplete cave icon audit')
    for key,zone in data['maps'].items():
        if zone.get('reviewed') is not True or not re.fullmatch('[a-f0-9]{64}',zone['image_sha256']):
            raise ValueError('Missing cave map provenance '+key)
        if zone['width']<=0 or zone['height']<=0:
            raise ValueError('Invalid cave source dimensions')
        seen=set()
        for point in zone['icons']:
            if not all(isinstance(point[k],int) for k in ['x','y','r']) or not (0<=point['x']<zone['width'] and 0<=point['y']<zone['height'] and 1<=point['r']<=30):
                raise ValueError('Invalid cave icon '+key)
            pair=(point['x'],point['y'])
            if pair in seen:raise ValueError('Duplicate cave icon '+key)
            seen.add(pair)
    text=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    return {'cave-icons.json':(text+'\n').encode(),'cave-icons.js':('window.WOW_CAVE_ICONS='+text+';\n').encode()}
