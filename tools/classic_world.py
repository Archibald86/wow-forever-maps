"""Conservative world-map selection and source-based spawn upper bounds."""
from collections import Counter, defaultdict
from functools import lru_cache
import gzip
import hashlib
import json

TYPES={1:'Beast',2:'Dragonkin',3:'Demon',4:'Elemental',5:'Giant',6:'Undead',7:'Humanoid',9:'Mechanical'}

def pool_capacities(pools,children,direct_pool_ids):
    """Creature upper capacities, not the number of child pools selected."""
    visiting=set()
    @lru_cache(None)
    def capacity(pool):
        assert pool not in visiting,'Cyclic pool graph'
        visiting.add(pool);limit=pools[pool]['max_limit'];assert limit>0
        result=(limit if pool in direct_pool_ids else 0)+sum(sorted((capacity(c) for c in children.get(pool,())),reverse=True)[:limit])
        visiting.remove(pool);return result
    return {pool:capacity(pool) for pool in pools}

def extend_world(data,root):
    source=root/'sources/classic_spawns';config=json.loads((source/'config-world.json').read_text())
    blob=(source/'world.json.gz').read_bytes()
    assert hashlib.sha256(blob).hexdigest()==config['source_sha256'], 'World source digest mismatch'
    raw=json.loads(gzip.decompress(blob));templates={t['Entry']:t for t in raw['templates']}
    questie=json.loads(gzip.decompress((root/'sources/questie/tables.json.gz').read_bytes()))['npcs']['rows']
    atlas=json.loads((root/'npc-atlas.json').read_text())['npcs']
    factions=raw['faction_enemy_groups'];eligible=set();rejected=Counter();kill_targets={r['npc'] for r in raw['quest_kill_objectives']}
    for entry,t in templates.items():
        reason=None
        if t['CreatureType'] not in TYPES:reason='non_combat_creature_type'
        elif (t['NpcFlags'] or t['Civilian']) and entry not in kill_targets:reason='services_or_civilian'
        elif t['UnitFlags'] & (0x2|0x100|0x02000000):reason='non_attackable_or_unselectable'
        elif not (entry in kill_targets or factions.get(str(t['Faction']),0)&1 or
                  t['CreatureType']==1 and t['Faction'] in config['neutral_beast_factions'] or
                  t['CreatureType']==7 and t['Faction'] in config['neutral_humanoid_factions']):reason='unconfirmed_combat_faction'
        if reason:rejected[reason]+=1
        else:eligible.add(entry)
    variants=defaultdict(set)
    for v in raw['alternatives']:variants[v['guid']].add(v['entry'])
    groups={g['Id']:g for g in raw['groups']};group_guids=defaultdict(set);guid_groups=defaultdict(set)
    for row in raw['group_members']:
        if row['Id'] in groups:
            group_guids[row['Id']].add(row['Guid']);guid_groups[row['Guid']].add(row['Id'])
    group_entries=defaultdict(set)
    for row in raw['group_entries']:group_entries[row['Id']].add(row['Entry'])
    linked={r[k] for r in raw['group_links'] for k in ('Id','LinkedId')}
    conditional={g for g,r in groups.items() if r['Flags'] or r['WorldState'] or r['WorldStateExpression'] or g in linked}
    event_guids={r['guid'] for r in raw['events']}
    entries={};row_by_guid={}
    for row in raw['rows']:
        guid=row['guid'];assert guid not in row_by_guid;row_by_guid[guid]=row
        ids=({row['id']} if row['id'] else variants[guid].copy())
        if not ids:
            for group in guid_groups[guid]:ids.update(group_entries[group])
        entries[guid]=ids
    pools={p['entry']:p for p in raw['pools']};parents=defaultdict(set);children=defaultdict(set)
    invalid_links=[p for p in raw['pool_links'] if p['pool_id'] not in pools or p['mother_pool'] not in pools]
    for p in raw['pool_links']:
        if p in invalid_links:continue
        parents[p['pool_id']].add(p['mother_pool']);children[p['mother_pool']].add(p['pool_id'])
    direct=defaultdict(set);template_pools=defaultdict(set);ambiguous_pool_guids=set()
    for p in raw['pool_members']:direct[p['pool_entry']].add(p['guid'])
    for p in raw['pool_templates']:template_pools[p['id']].add(p['pool_entry'])
    for guid,ids in entries.items():
        if not ids:continue
        memberships=[template_pools[e] for e in ids]
        definite=set.intersection(*memberships)
        possible=set.union(*memberships)
        if definite!=possible:ambiguous_pool_guids.add(guid)
        for p in definite:direct[p].add(guid)
    # A parent pool limits active child pools. Its limit must NOT be applied
    # directly to creature GUIDs: children can each contain several creatures.
    # Core spawns direct creatures and child pools separately, each with MaxLimit.
    pool_type_has_direct={r['pool_entry'] for r in raw['pool_templates']}|{r['pool_entry'] for r in raw['pool_members']}
    capacities=pool_capacities(pools,children,pool_type_has_direct)
    @lru_cache(None)
    def pool_members(pool):
        result=set(direct[pool])
        for child in children[pool]:result.update(pool_members(child))
        return frozenset(result)
    constraints={}
    for group,g in groups.items():
        if group not in conditional and g['MaxCount']>0:
            constraints['g'+str(group)]={'limit':g['MaxCount'],'members':group_guids[group],'name':g['Name'],'kind':'group'}
    for pool,p in pools.items():
        cap=capacities[pool]
        if cap>0 and pool_members(pool):constraints['p'+str(pool)]={'limit':cap,'members':pool_members(pool),'name':p['description'],'kind':'nested_pool' if children[pool] else 'pool'}
    guid_constraints=defaultdict(list)
    for key,c in constraints.items():
        for guid in c['members']:guid_constraints[guid].append(key)
    allowed_by_area=defaultdict(set)
    for entry in eligible:
        spawn=questie.get(str(entry),{}).get('7',{})
        if isinstance(spawn,dict):
            for area,positions in spawn.items():
                if positions:allowed_by_area[int(area)].add(entry)
    report={};all_ids={str(i) for m in data['maps'].values() for p in m['points'] for i in p[3]}
    data['npcs']={key:value for key,value in data['npcs'].items() if key in all_ids}
    for name,frame in config['maps'].items():
        if name=='elwynn_c60':
            report[name]={'positions':len(data['maps'][name]['points']),'species':data['maps'][name]['species'],'selection':'reviewed_elwynn_baseline'};continue
        allowed=allowed_by_area[frame['area_id']];minx,miny,maxx,maxy=frame['bounds'];excluded=Counter();points=[];used_ids=set()
        for guid,r in row_by_guid.items():
            if r['map']!=frame['world_map_id'] or not(minx<=r['position_x']<=maxx and miny<=r['position_y']<=maxy):continue
            ids=entries[guid]
            if not ids:excluded['unresolved_template']+=1;continue
            if not(ids&allowed):excluded['species_outside_selection']+=1;continue
            if not ids<=eligible:excluded['mixed_combat_and_unconfirmed_alternatives']+=1;continue
            if guid in event_guids:excluded['event_linked']+=1;continue
            if guid_groups[guid]&conditional:excluded['conditional_or_linked_group']+=1;continue
            if guid in ambiguous_pool_guids:excluded['conditional_pool_membership']+=1;continue
            # Keep all combat alternatives. An alternate may lack a Questie zone
            # record even though the shared Classic GUID is present in the frame.
            x=round((maxy-r['position_y'])/(maxy-miny)*100,2);y=round((maxx-r['position_x'])/(maxx-minx)*100,2)
            points.append([guid,x,y,sorted(ids),r['spawntimesecsmin'],r['spawntimesecsmax'],r['MovementType'],sorted(guid_constraints[guid])]);used_ids.update(ids)
        ids_on_map={p[0] for p in points};map_constraints={}
        for key in sorted({k for p in points for k in p[7]}):
            c=constraints[key];map_constraints[key]={**c,'members':sorted(c['members']&ids_on_map),'total_members':len(c['members'])}
        levels=[templates[i]['MinLevel'] for i in used_ids];highs=[templates[i]['MaxLevel'] for i in used_ids]
        data['maps'][name]={'points':points,'constraints':map_constraints,'min_level':min(levels,default=1),'max_level':max(highs,default=1),'species':len(used_ids),'excluded_event_positions':excluded['event_linked'],'area_id':frame['area_id'],'selection_exclusions':dict(excluded)}
        report[name]={'positions':len(points),'species':len(used_ids),'constraints':len(map_constraints),'exclusions':dict(excluded)};all_ids.update(map(str,used_ids))
    for key in sorted(all_ids,key=int):
        if key in data['npcs']:continue
        t=templates[int(key)];base=atlas.get(key,{})
        data['npcs'][key]={'id':int(key),'name':base.get('name',t['Name']),'name_en':t['Name'],'min_level':t['MinLevel'],'max_level':t['MaxLevel'],'rank':t['Rank'],'flags':t['NpcFlags'],'quest_starts':base.get('quest_starts',[]),'quest_ends':base.get('quest_ends',[]),'title':base.get('title'),'creature':{**base.get('creature',{}),'type':TYPES[t['CreatureType']],'status':'classic_reference','source':'classic_reference','source_type':TYPES[t['CreatureType']]}}
    data['scope']='40 Classic map frames; possible spawn GUIDs, curated combat candidates, historical source. Not live population or exact zone polygons.'
    data['selection_report']={'maps':report,'template_rejections':dict(rejected),'invalid_pool_links':invalid_links,'pool_upper_bound_model':'Direct creature capacity plus the largest MaxLimit child-pool capacities. Overlapping constraints are combined by a conservative disjoint cover at runtime.'}
    assert len(data['maps'])==40
    return data
