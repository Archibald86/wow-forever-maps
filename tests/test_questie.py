import gzip
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from import_questie import prepare

class QuestieIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw=json.loads(gzip.decompress((ROOT/'sources/questie/tables.json.gz').read_bytes()))
        cls.atlas=json.loads((ROOT/'npc-atlas.json').read_text())
        cls.data=json.loads((ROOT/'data.json').read_text())

    def test_positions_are_direct_source_coordinates_and_unique(self):
        for zone,points in self.atlas['maps'].items():
            self.assertEqual(len(points),len(set(map(tuple,points))))
            area=str(self.data['coverage'][zone]['npcs']['area_id'])
            for x,y,npc in points:
                source=self.raw['npcs']['rows'][str(npc)]['7'][area]
                self.assertTrue(any(p.get('1')==x and p.get('2')==y for p in source.values()))
                self.assertTrue(0<=x<=100 and 0<=y<=100)
            self.assertEqual(len(points),self.data['coverage'][zone]['npcs']['records'])
        self.assertEqual(self.atlas['maps']['darkspearisland'],[])
        for zone in ['deadwindpass_c60','moonglade_c60','teldrassil_c60','zephrasisle']:
            self.assertTrue(self.atlas['maps'][zone])
        self.assertEqual(self.data['mobs']['moonglade_c60'],[]) # source gap remains explicit

    def test_catalogs_preserve_ids_fields_and_localized_lookup(self):
        for kind,count in [('npcs',15564),('quests',5914),('items',23862),('objects',7289)]:
            catalog=json.loads((ROOT/f'database/{kind}.json').read_text())
            rows={str(row['id']):row for row in catalog['rows']}
            self.assertEqual(len(rows),count)
            self.assertEqual(set(rows),set(self.raw[kind]['rows']))
        npc=json.loads((ROOT/'database/npcs.json').read_text())['rows']
        vermin=next(row for row in npc if row['id']==6)
        self.assertEqual(vermin['name'],'Кобольд-вредитель')
        self.assertNotIn('minLevelHealth',vermin['fields'])
        self.assertNotIn('maxLevelHealth',vermin['fields'])

    def test_service_entities_never_enter_map_layer(self):
        self.assertNotIn('1',self.atlas['npcs'])
        self.assertNotIn('2',self.atlas['npcs'])
        self.assertEqual(sum(map(len,self.data['mobs'].values())),4953)
        self.assertEqual(sum(map(len,self.data['ore'].values())),5459)
        self.assertEqual(sum(map(len,self.data['herbs'].values())),10645)
