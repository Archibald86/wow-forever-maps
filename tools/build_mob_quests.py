"""Index explicit Classic kill objectives and Questie Forever quest-item drops.

NPC interaction objectives (healing, resurrection, spells) are not kills.
Each quest is counted once per NPC, even when several required items drop.
"""
import gzip
import json
from collections import defaultdict


def derive(kills, quests, items):
    index = defaultdict(lambda: [set(), set()])
    quest_by_id = {q['id']: q for q in quests}
    for row in kills:
        quest = quest_by_id.get(row['quest'], {})
        objectives = quest.get('fields', {}).get('objectives', {}).get('1', {})
        # Questie's third field marks special NPC interactions, e.g. healing.
        matched = any(o.get('1') == row['npc'] and not o.get('3')
                      for o in objectives.values())
        if matched and row['count'] > 0:
            index[row['npc']][0].add(row['quest'])
    drops = {i['id']: i['fields'].get('npcDrops', {}).values() for i in items}
    for quest in quests:
        objectives = quest['fields'].get('objectives', {}).get('3', {})
        for objective in objectives.values():
            for npc in drops.get(objective.get('1'), ()):
                if isinstance(npc, int) and npc > 0:
                    index[npc][1].add(quest['id'])
    return {str(npc): [sorted(kill), sorted(loot - kill)]
            for npc, (kill, loot) in sorted(index.items())}


def prepare(source, exports):
    world = json.loads(gzip.decompress((source/'classic_spawns/world.json.gz').read_bytes()))
    quests = json.loads(exports['database/quests.json'])['rows']
    items = json.loads(exports['database/items.json'])['rows']
    data = {'schema_version': 1, 'npcs': derive(world['quest_kill_objectives'], quests, items),
            'questie_commit': json.loads(exports['database/quests.json'])['commit'],
            'kill_source': 'CMaNGOS Classic-DB; historical reference',
            'loot_source': 'QuestieDB Forever; required item -> npcDrops',
            'character_availability_checked': False}
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return {'mob-quest-data.js': ('window.WOW_MOB_QUESTS='+encoded+';\n').encode()}
