import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from build_mob_quests import derive


class MobQuestTests(unittest.TestCase):
    def test_unique_quests_and_special_interactions(self):
        quests = [
            {'id': 1, 'fields': {'objectives': {'1': {'1': {'1': 10}},
                                               '3': {'1': {'1': 100}, '2': {'1': 101}}}}},
            {'id': 2, 'fields': {'objectives': {'3': {'1': {'1': 100}, '2': {'1': 101}}}}},
            {'id': 3, 'fields': {'objectives': {'1': {'1': {'1': 20, '3': 17}}}}},
        ]
        items = [{'id': n, 'fields': {'npcDrops': {'1': 10, '2': 30}}}
                 for n in (100, 101)]
        kills = [{'quest': q, 'npc': npc, 'count': 1}
                 for q, npc in ((1, 10), (1, 10), (3, 20), (999, 10), (2, 40))]
        self.assertEqual(derive(kills, quests, items), {'10': [[1], [2]], '30': [[], [1, 2]]})

    def test_actual_data_includes_loot_not_healing(self):
        text = (ROOT/'mob-quest-data.js').read_text()
        data = json.loads(text.removeprefix('window.WOW_MOB_QUESTS=').strip().removesuffix(';'))['npcs']
        self.assertIn(7, data['6'][0])  # Kobold Camp Cleanup.
        self.assertIn(6, data['103'][1])  # Garrick's Head.
        self.assertNotIn('6172', data)  # Resurrection is not a kill.
        self.assertNotIn('12423', data)  # Healing Guard Roberts is not a kill.


if __name__ == '__main__':
    unittest.main()
