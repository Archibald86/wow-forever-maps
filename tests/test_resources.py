import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Resources(unittest.TestCase):
    def test_sourced_catalog_and_teacher_layer(self):
        data = json.loads((ROOT/'data.json').read_text())
        self.assertEqual(len(data['catalog']),42)
        self.assertEqual(sum(info['min_skill'] is not None for info in data['catalog'].values()),41)
        self.assertEqual(data['catalog']['219']['skill_status'],'unknown')
        self.assertEqual(data['catalog']['208']['min_skill'],230)
        self.assertEqual(data['catalog']['214']['min_skill'],245)
        teachers = [item for values in data['trainers'].values() for item in values]
        self.assertEqual(len(teachers),35)
        self.assertEqual(len({item['id'] for item in teachers}),35)
        self.assertEqual(len(data['trainers']['zephrasisle']),4)
        for zone,values in data['trainers'].items():
            self.assertEqual(data['coverage'][zone]['trainers']['records'],len(values))
            self.assertFalse(data['coverage'][zone]['trainers']['complete'])
            for item in values:
                self.assertEqual(item['zone'],zone)
                self.assertEqual(item['coordinate_alignment'],'unverified')
                self.assertTrue(item['source_url'].startswith('https://www.wowhead.com/forever/'))

    def test_all_imported_records_match_source_manifest(self):
        data = json.loads((ROOT/'data.json').read_text())
        manifest = json.loads((ROOT/'sources/resource_import_manifest.json').read_text())
        mapping = json.loads((ROOT/'sources/zone_mapping.json').read_text())['zones']
        self.assertEqual(len(mapping),37)
        self.assertEqual(sum(map(len,data['herbs'].values())),9319)
        self.assertEqual(sum(map(len,data['ore'].values())),4511)
        for layer in ['ore','herbs']:
            self.assertEqual(set(data[layer]),set(mapping))
            for key,points in data[layer].items():
                expected = manifest['records'][layer][key]
                self.assertEqual(len(points),expected['count'])
                digest = hashlib.sha256(json.dumps(points,separators=(',',':')).encode()).hexdigest()
                self.assertEqual(digest,expected['sha256'])
                self.assertEqual(data['coverage'][key][layer]['records'],len(points))
                self.assertEqual(data['coverage'][key][layer]['coordinate_alignment'],'unverified')

    def test_coverage_distinguishes_missing_mobs_and_unobserved_resources(self):
        data = json.loads((ROOT/'data.json').read_text())
        self.assertEqual(data['coverage']['zephrasisle']['mobs']['status'],'missing')
        self.assertEqual(data['coverage']['zephrasisle']['ore']['records'],294)
        self.assertEqual(data['coverage']['zephrasisle']['herbs']['records'],628)
        self.assertEqual(data['coverage']['darkspearisland']['ore']['status'],'no_source_records')


if __name__ == '__main__':
    unittest.main()
