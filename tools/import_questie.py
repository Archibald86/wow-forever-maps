"""Derive searchable catalogs and a separate NPC atlas from pinned Forever tables.

Normal build uses only gzip/json from the Python standard library.
To refresh: export QuestieDB with --include-authored, run tools/export_questie.lua
from that checkout, gzip its JSON with mtime=0, update provenance and input lock.
"""
import gzip
import json
import re


def encode(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n').encode()


def sequence(value):
    return [v for k,v in sorted((value or {}).items(), key=lambda p:int(p[0]))]


def prepare(source, zones):
    raw=json.loads(gzip.decompress((source/'questie/tables.json.gz').read_bytes()))
    provenance=json.loads((source/'questie/provenance.json').read_text())
    source_maps=json.loads((source/'zone_mapping.json').read_text())['zones']
    areas={key:int(raw['uiMapToArea'][str(ui)]) for key,ui in source_maps.items()}
    if set(areas)!={z['id'] for z in zones}:
        raise ValueError('Incomplete Questie map mapping')
    atlas={'schema_version':1,'source':provenance['source'],'commit':provenance['commit'],
           'alignment':'unverified','maps':{key:[] for key in areas},'npcs':{}}
    outputs={}
    counts={}
    excluded=invalid=duplicates=0
    for kind in ['npcs','quests','items','objects']:
        section=raw[kind]
        records=[]
        for key,row in sorted(section['rows'].items(), key=lambda p:int(p[0])):
            ident=int(key)
            english=row.get('1') or f'ID {ident}'
            localized=section['ruRU'].get(key)
            name=(localized.get('1') if isinstance(localized,dict) else localized) or english
            fields={label:row[index] for index,label in provenance['fields'][kind].items()
                    if index in row and index!='1' and label not in ['minLevelHealth','maxLevelHealth']}
            record={'id':ident,'name':name,'name_en':english,'fields':fields}
            if kind=='quests' and isinstance(localized,dict) and localized.get('2'):
                record['objectives_text']=sequence(localized['2'])
            records.append(record)
            if kind!='npcs':
                continue
            # Keep service/debug/unknown rows in the catalog, but avoid misleading map pins.
            if re.search(r'(?i)(only gm|\bunused\b|\bdebug\b|\btest\b|\bplaceholder\b|^unknown$)',english):
                excluded+=1
                continue
            meta={'id':ident,'name':name,'name_en':english,'min_level':row.get('4'),
                  'max_level':row.get('5'),'rank':row.get('6',0),'flags':row.get('15',0),
                  'quest_starts':sequence(row.get('10')),'quest_ends':sequence(row.get('11')),
                  'title':(localized.get('2') if isinstance(localized,dict) else None) or row.get('14')}
            for zone,area in areas.items():
                seen=set()
                for point in sequence((row.get('7') or {}).get(str(area))):
                    x,y=point.get('1'),point.get('2')
                    if not all(isinstance(v,(int,float)) and 0<=v<=100 for v in [x,y]):
                        invalid+=1
                        continue
                    position=(x,y,ident)
                    if position in seen:
                        duplicates+=1
                        continue
                    seen.add(position)
                    atlas['maps'][zone].append(list(position))
                    atlas['npcs'][key]=meta
        counts[kind]=len(records)
        outputs['database/'+kind+'.json']=encode({'schema_version':1,'kind':kind,
            'source':provenance['source'],'commit':provenance['commit'],'rows':records})
    coverage={key:{'status':'static_source' if points else 'no_source_records',
        'records':len(points),'entities':len({p[2] for p in points}),'area_id':areas[key],
        'coordinate_alignment':'unverified','complete':False} for key,points in atlas['maps'].items()}
    summary={'source':provenance['source'],'commit':provenance['commit'],'counts':counts,
        'locale':'ruRU with enUS fallback','coverage':coverage,'excluded_map_entities':excluded,
        'invalid_positions_skipped':invalid,'duplicate_positions_skipped':duplicates,
        'limitations':['Static source; no live spawn counts or drop rates.',
            'No character-specific dynamic corrections or derived passes.',
            'NPC health placeholders omitted; original fields remain in pinned source.',
            'Only direct AreaID matches; no coordinate conversion applied.']}
    outputs['database/manifest.json']=encode(summary)
    outputs['npc-atlas.json']=encode(atlas)
    outputs['npc-atlas.js']=b'window.WOW_NPCS='+encode(atlas).rstrip()+b';\n'
    return outputs,summary
