"""Build 40 Classic possible-spawn layers from pinned, attributed sources."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'sources/classic_spawns'

def build():
    config = json.loads((SOURCE / 'config.json').read_text())
    compressed = (SOURCE / 'elwynn.json.gz').read_bytes()
    assert hashlib.sha256(compressed).hexdigest() == config['source_sha256'], 'Source digest mismatch'
    raw = json.loads(gzip.decompress(compressed))
    allowed = set(config['allowed_npc_ids'])
    atlas = json.loads((ROOT / 'npc-atlas.json').read_text())
    type_names = {1:'Beast',7:'Humanoid',9:'Mechanical'}
    npcs = {}
    for t in raw['templates']:
        entry = t['Entry']
        assert entry in allowed and t['CreatureType'] in type_names and t['NpcFlags'] == 0
        meta = atlas['npcs'][str(entry)]
        npcs[str(entry)] = {**meta, 'min_level':t['MinLevel'], 'max_level':t['MaxLevel'],
                           'name_en':t['Name'], 'creature':{**meta['creature'], 'type':type_names[t['CreatureType']]}}
    assert set(map(int,npcs)) == allowed
    constraints = {}
    for g in raw['groups']:
        assert not (g['WorldState'] or g['WorldStateExpression'] or g['Flags']), 'Unresolved conditional group'
        if g['MaxCount']:
            constraints['g'+str(g['Id'])] = {'limit':g['MaxCount'], 'members':[m['Guid'] for m in g['members']], 'name':g['Name']}
    assert not raw['pool_links'], 'Hierarchical pools need a separate model'
    pools = {p['entry']:p for p in raw['pools']}
    for p in raw['pools']:
        constraints['p'+str(p['entry'])] = {'limit':p['max_limit'], 'members':[], 'name':p['description']}
    event_guids = {r['guid'] for r in raw['events']}
    minx,miny,maxx,maxy = raw['bounds']
    points=[];seen=set()
    for r in raw['rows']:
        guid = r['guid']
        assert guid not in seen, 'GUID would be counted twice'
        seen.add(guid)
        assert r['map']==config['world_map_id'] and set(r['entries']) <= allowed and r['entries']
        if guid in event_guids:
            continue
        x=round((maxy-r['position_y'])/(maxy-miny)*100,2)
        y=round((maxx-r['position_x'])/(maxx-minx)*100,2)
        assert 0<=x<=100 and 0<=y<=100
        for p in raw['pool_templates']:
            intersection=set(r['entries']) & {p['id']}
            assert not intersection or len(r['entries'])==1, 'Conditional pool membership is unresolved'
            if intersection:
                constraints['p'+str(p['pool_entry'])]['members'].append(guid)
        for p in raw['pool_members']:
            if p['guid']==guid:constraints['p'+str(p['pool_entry'])]['members'].append(guid)
        keys=[k for k,c in constraints.items() if guid in c['members']]
        assert len(keys)<=1, 'Overlapping capped constraints need a joint model'
        points.append([guid,x,y,r['entries'],r['spawntimesecsmin'],r['spawntimesecsmax'],r['MovementType'],keys])
    for c in constraints.values():c['members']=sorted(set(c['members']))
    map_data={'points':points,'constraints':constraints,'min_level':min(n['min_level'] for n in npcs.values()),
              'max_level':max(n['max_level'] for n in npcs.values()), 'species':len({i for p in points for i in p[3]}), 'curated_species':len(npcs), 'excluded_event_positions':len(event_guids)}
    data={'schema_version':1,'source':raw['source'],'scope':config['selection'], 'npcs':npcs,'maps':{config['map']:map_data}}
    from classic_world import extend_world
    return extend_world(data,ROOT)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    d=build();text=json.dumps(d,ensure_ascii=False,separators=(',',':'))
    outputs={'classic-spawn-data.json':text+'\n','classic-spawn-data.js':'window.WOW_CLASSIC_SPAWNS='+text+';\n'}
    for name,content in outputs.items():
        file=ROOT/name
        if args.check:
            assert file.read_text()==content, 'Stale generated output: '+name
        else:file.write_text(content)
    print('Classic spawns:',len(d['maps']),'maps;',sum(len(m['points']) for m in d['maps'].values()),'map-frame positions;',len(d['npcs']),'species')

if __name__=='__main__':main()
