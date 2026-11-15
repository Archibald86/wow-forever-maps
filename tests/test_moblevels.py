import csv
import gzip
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from import_moblevels import prepare


class MobDensitySources(unittest.TestCase):
    def test_new_zone_coverage_and_audited_override(self):
        data=json.loads((ROOT/'data.json').read_text())
        expected={'alteracmountains_c60':130,'arathihighlands_c60':110,'badlands_c60':160,
                  'redridgemountains_c60':169,'mulgore_c60':99,'deadwindpass_c60':56,
                  'teldrassil_c60':76,'zephrasisle':61}
        self.assertEqual(sum(map(len,data['mobs'].values())),4953)
        self.assertEqual(sum(bool(v) for v in data['mobs'].values()),40)
        self.assertEqual(data['mobs']['darkspearisland'],[])
        self.assertEqual(data['mobs']['moonglade_c60'],[])
        for key,count in expected.items():self.assertEqual(len(data['mobs'][key]),count,key)
        # Audited correction: Barrens cell (12,9) was level 16, now level 14.
        points=data['mobs']['barrens_c60'];i=next(i for i,r in enumerate(points) if r[:2]==[55,40])
        self.assertEqual(points[i],[55,40,14,1])
        self.assertEqual(data['mob_origins']['barrens_c60'][i],'classic_reference') # obsolete override removed upstream
        j=next(i for i,r in enumerate(points) if r[:2]==[60,20])
        self.assertEqual(points[j],[60,20,14,2])
        self.assertEqual(data['mob_origins']['barrens_c60'][j],'forever_override')
        self.assertEqual(sum(v.count('forever_override') for v in data['mob_origins'].values()),215)
        for key,points in data['mobs'].items():
            info=data['coverage'][key]['mobs']
            self.assertEqual(info['classic_reference_cells']+info['forever_override_cells'],len(points))
            self.assertFalse(info['live_population_verified'])
        self.assertEqual(data['sources']['mobs']['version'],'1.0.7')

    def test_bad_cells_or_disagreeing_csv_are_rejected(self):
        zones=json.loads((ROOT/'sources/zones.json').read_text())
        for mutation in ['duplicate','outside_grid','unknown_origin','csv_changed']:
            with self.subTest(mutation=mutation),tempfile.TemporaryDirectory() as directory:
                source=Path(directory)
                shutil.copytree(ROOT/'sources/moblevels',source/'moblevels')
                shutil.copyfile(ROOT/'sources/mob_cells.csv',source/'mob_cells.csv')
                file=source/'moblevels/tables.json.gz';tables=json.loads(gzip.decompress(file.read_bytes()))
                row=tables['The Barrens'][0]
                if mutation=='duplicate':tables['The Barrens'].append(row.copy())
                elif mutation=='outside_grid':row[0]=21
                elif mutation=='unknown_origin':row[4]='verified_live'
                else:
                    path=source/'mob_cells.csv';path.write_text(path.read_text(encoding='utf-8-sig').replace('1.0.7','1.0.5',1),encoding='utf-8-sig')
                file.write_bytes(gzip.compress(json.dumps(tables).encode(),mtime=0))
                with self.assertRaises(ValueError):prepare(source,zones)
