"""Extract a compact, auditable Classic world source cache; not needed by CI."""
import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path
import re
import sqlite3

def main():
    p=argparse.ArgumentParser();p.add_argument('--database',required=True);p.add_argument('--frames',required=True);p.add_argument('--questie',required=True);args=p.parse_args()
    root=Path(__file__).resolve().parents[1];out=root/'sources/classic_spawns'
    c=sqlite3.connect('file:'+str(Path(args.database).resolve())+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
    def table(name,sql=None):return [dict(r) for r in c.execute(sql or 'SELECT * FROM '+name)]
    factions=Path(args.questie)/'support/FactionTemplates/factionTemplateClassic.lua'
    zones=Path(args.questie)/'support/Forever/Zones/uiMapIdToAreaId.lua'
    faction_map={int(k):int(v) for k,v in re.findall(r'\[(\d+)\]\s*=\s*(\d+)',factions.read_text())}
    area_map={int(k):int(v) for k,v in re.findall(r'\[(\d+)\]\s*=\s*(\d+)',zones.read_text())}
    mappings=json.loads((root/'sources/zone_mapping.json').read_text())['zones']
    frames={int(r['uiMapID']):r for r in csv.DictReader(open(args.frames,encoding='utf-8-sig'))}
    maps={name:{'ui_map_id':ui,'area_id':area_map[ui],'world_map_id':int(frames[ui]['continent_map']),'bounds':list(map(float,frames[ui]['bounds'].split(',')))} for name,ui in mappings.items() if 1411<=ui<=1452}
    assert len(maps)==40
    keys=['Entry','Name','MinLevel','MaxLevel','CreatureType','NpcFlags','UnitFlags','Civilian','Rank','Faction']
    kill_objectives=[]
    for q in table('quest_template'):
        for slot in range(1,5):
            npc=q['ReqCreatureOrGOId'+str(slot)];count=q['ReqCreatureOrGOCount'+str(slot)];spell=q['ReqSpellCast'+str(slot)]
            if npc>0 and count>0 and spell==0:kill_objectives.append({'quest':q['entry'],'npc':npc,'count':count})
    raw={'schema_version':1,'source':json.loads(gzip.decompress((out/'elwynn.json.gz').read_bytes()))['source'],
         'templates':table('creature_template','SELECT '+','.join(keys)+' FROM creature_template'),
         'rows':table('creature','SELECT guid,id,map,position_x,position_y,spawntimesecsmin,spawntimesecsmax,MovementType FROM creature WHERE map IN (0,1)'),
         'alternatives':table('creature_spawn_entry'),'group_entries':table('spawn_group_entry'),
         'groups':table('spawn_group','SELECT * FROM spawn_group WHERE Type=0'),
         'group_members':table('spawn_group_spawn'), 'group_links':table('spawn_group_linked_group'),
         'events':table('game_event_creature'),'quest_kill_objectives':kill_objectives,
         'pools':table('pool_template'),'pool_members':table('pool_creature'),'pool_templates':table('pool_creature_template'),'pool_links':table('pool_pool'),
         'faction_enemy_groups':faction_map,'faction_source_sha256':hashlib.sha256(factions.read_bytes()).hexdigest(),
         'zone_source_sha256':hashlib.sha256(zones.read_bytes()).hexdigest()}
    blob=gzip.compress(json.dumps(raw,separators=(',',':')).encode(),mtime=0);(out/'world.json.gz').write_bytes(blob)
    config={'schema_version':1,'source_sha256':hashlib.sha256(blob).hexdigest(),'maps':maps,
      'selection':'Classic creature types 1-7 and 9, no non-attackable flags; enemy-of-player faction mask, reviewed neutral animal/starter factions, or explicit Classic quest kill objectives without spell-cast requirements. Services/civilians excluded unless explicit kill targets. Species must have Questie AreaID records for this zone; GUIDs must lie in its map frame. Elwynn retains its reviewed 46-species source.',
      'neutral_beast_factions':[7,15,32,189],'neutral_humanoid_factions':[25,36]}
    (out/'config-world.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
    print('Cached',len(raw['rows']),'world GUIDs;',len(blob),'compressed bytes; 40 frames')

if __name__=='__main__':main()
