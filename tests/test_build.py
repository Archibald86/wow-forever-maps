import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from build_data import build


class ReproducibleBuild(unittest.TestCase):
    def test_build_without_existing_exports_is_deterministic(self):
        first,second = build(),build()
        self.assertEqual(first,second)
        for name,content in first.items():
            self.assertEqual((ROOT/name).read_bytes(),content,name)
        data = json.loads(first['data.json'])
        self.assertEqual(sum(map(len,data['mobs'].values())),4066)
        self.assertEqual(sum(map(len,data['ore'].values())),4511)
        self.assertEqual(sum(map(len,data['herbs'].values())),9319)

    def test_modified_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            shutil.copytree(ROOT/'sources',target/'sources')
            path = target/'sources/gathermate/MiningData.lua'
            path.write_bytes(path.read_bytes()+b'\n-- unexpected modification')
            with self.assertRaisesRegex(ValueError,'Pinned source changed'):
                build(target)
