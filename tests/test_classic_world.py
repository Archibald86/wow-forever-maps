import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from classic_world import pool_capacities

class ClassicWorld(unittest.TestCase):
    def test_nested_pool_cap_counts_creatures_not_child_pools(self):
        pools={1:{'max_limit':1},2:{'max_limit':2},3:{'max_limit':3}}
        caps=pool_capacities(pools,{1:{2,3}},{2,3})
        self.assertEqual(caps[1],3)
        self.assertEqual(pool_capacities(pools,{1:{2,3}},{1,2,3})[1],4)

    def test_invalid_pool_cycles_are_rejected(self):
        with self.assertRaisesRegex(AssertionError,'Cyclic'):
            pool_capacities({1:{'max_limit':1},2:{'max_limit':1}},{1:{2},2:{1}},{1})

    def test_all_classic_maps_have_unique_guid_positions_and_no_modern_entities(self):
        d=json.loads((ROOT/'classic-spawn-data.json').read_text());self.assertEqual(len(d['maps']),40)
        self.assertNotIn('darkspearisland',d['maps']);self.assertNotIn('zephrasisle',d['maps']);self.assertNotIn('271929',d['npcs'])
        for name,m in d['maps'].items():
            with self.subTest(map=name):
                self.assertTrue(m['points']);self.assertEqual(len(m['points']),len({p[0] for p in m['points']}))
                self.assertEqual(m['species'],len({e for p in m['points'] for e in p[3]}))
                for p in m['points']:
                    self.assertTrue(0<=p[1]<=100 and 0<=p[2]<=100)
                    for key in p[7]:self.assertIn(p[0],m['constraints'][key]['members'])
        self.assertEqual(len(d['maps']['elwynn_c60']['points']),1161)

if __name__=='__main__':unittest.main()
