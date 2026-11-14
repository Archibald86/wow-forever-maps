import gzip
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from import_creature_types import classification,read_types

class CreatureTypeReference(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lookup,cls.provenance=read_types(ROOT/'sources')
        cls.rows=json.loads((ROOT/'database/npcs.json').read_text())['rows']
        cls.atlas=json.loads((ROOT/'npc-atlas.json').read_text())

    def test_only_specific_types_count_as_known(self):
        known=[row for row in self.rows if row['creature']['type'] is not None]
        unknown=[row for row in self.rows if row['creature']['type'] is None]
        self.assertEqual(len(known),7146)
        self.assertEqual(len(unknown),8418)
        self.assertEqual(sum(r['creature']['source'] is not None for r in self.rows),7431)
        self.assertEqual(sum(r['creature']['type'] is not None for r in self.atlas['npcs'].values()),4451)
        self.assertEqual(sum(r['creature']['name_changed'] for r in self.rows),3)
        self.assertFalse(self.atlas['creature_types']['forever_verified'])
        for row in known:self.assertEqual(row['creature']['status'],'classic_reference')
        for row in unknown:self.assertEqual(row['creature']['status'],'unknown')

    def test_pin_metadata_and_catalog_agree_without_changing_source_fields(self):
        records={str(r['id']):r for r in self.rows}
        for key,npc in self.atlas['npcs'].items():
            self.assertEqual(npc['creature'],records[key]['creature'])
        self.assertEqual(records['6']['creature']['type'],'Humanoid')
        self.assertEqual(records['30']['creature']['type'],'Beast')
        self.assertEqual(records['30']['creature']['family'],'Spider')
        self.assertEqual(records['48']['creature']['type'],'Undead')
        self.assertEqual(records['36']['creature']['type'],'Mechanical')
        self.assertIsNone(records['251451']['creature']['type']) # no unlicensed/manual Zephras import
        self.assertEqual(records['10776']['creature']['source_name'],'Finkle Einhorn')
        self.assertTrue(records['10776']['creature']['name_changed'])
        self.assertEqual(sum(map(len,self.atlas['maps'].values())),94535)
        for row in self.rows:self.assertNotIn('creatureType',row['fields']) # separate source, not Questie field

    def test_unknown_and_unmapped_values_never_become_guesses(self):
        self.assertIsNone(classification(999999,'Forest Beast',{})['type'])
        for original in ['Other','Unspecified']:
            row=next(r for r in self.lookup.values() if r['source_type']==original)
            self.assertIsNone(row['type'])
        self.assertNotEqual(self.provenance['game_flavor'],'forever')
