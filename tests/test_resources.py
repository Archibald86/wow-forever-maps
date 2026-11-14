import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Resources(unittest.TestCase):
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
