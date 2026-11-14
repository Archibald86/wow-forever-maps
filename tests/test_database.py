"""Regression cases for the v3 coordinate corruption (standard library only)."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('rebuild_database', ROOT/'tools/rebuild_database.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Coordinates(unittest.TestCase):
    def test_documented_source_examples(self):
        # Published GatherMate format documentation: XXXXYYYY00.
        self.assertEqual(module.decode_coordinate(6430598000), (64.3, 59.8))
        self.assertEqual(module.decode_coordinate(5839314100), (58.39, 31.41))
        self.assertEqual(module.decode_coordinate(3040250000), (30.4, 25.0))

    def test_axis_boundaries(self):
        self.assertEqual(module.decode_coordinate(0), (0, 0))
        self.assertEqual(module.decode_coordinate(990000), (0, 99))
        self.assertEqual(module.decode_coordinate(9900000000), (99, 0))

    def test_reject_invalid_encoding(self):
        for key in [-1, 10000000000]:
            with self.assertRaises(ValueError):
                module.decode_coordinate(key)

    def test_read_lua_and_preserve_node_type(self):
        text = 'GatherMateData2MineDB = {\n [1440] = {\n [560146000] = 202,\n },\n}'
        self.assertEqual(module.parse_mining(text), {1440: [(5.6,14.6,202)]})

    def test_site_keeps_known_source_coordinates(self):
        data = json.loads((ROOT/'data.json').read_text(encoding='utf-8'))
        self.assertEqual(data['ore']['ashenvale_c60'][0], [5.6,14.6,202])
        self.assertIn([35.6,35.5,201], data['ore']['durotar_c60'])
        self.assertEqual(sum(len(v) for v in data['ore'].values()), 4511)
        additions = {'hillsbrad_c60':141, 'stonetalonmountain_c60':133, 'zephrasisle':294}
        for key,count in additions.items():
            self.assertEqual(len(data['ore'][key]), count)
        self.assertEqual(sum(len(v) for k,v in data['ore'].items() if k not in additions), 3943)


if __name__ == '__main__':
    unittest.main()
