WoW Forever Maps — версия 3.4, этап 4.
Откройте index.html или разместите сайт на статическом хостинге.
42 карты; 4 953 ячейки мобов; 5 459 записей руды; 10 645 записей трав.
Справочник 44 ресурсов, фильтры по навыкам и цели, подсказки, 35 записей учителей.
Настройки сохраняются в браузере и передаются по ссылке.
Один порог навыка не подтверждён. Учителя представлены неполной справочной выборкой.
Игровое совмещение и реальные спавны не проверены.
Сборка: python tools/build_data.py
Проверка: python tools/build_data.py --check
Подробности и первичные источники: STAGE4_FIXES.md.

QuestieDB integration (2026-11-15): see QUESTIEDB_INTEGRATION.md.
Catalog: database.html. Optional NPC map layer; direct file atlas fallback retained.
Sources/terms: sources/questie/NOTICE.md. Rebuild: python tools/build_data.py --check

Creature type filters: see CREATURE_TYPES.md. Classic reference types are preliminary; unknowns remain explicit.

Selected NPC area counts, grouping, zoom and shared coordinates: see NPC_AREA.md. These are source position records, not live creature counts.

Cave glyphs: 156 red circles on 40 maps; all 42 artworks reviewed. See CAVE_MARKERS.md. Toggle caves=1/0; original images unchanged.

Five Classic outdoor zones added: see CLASSIC_ZONES.md. New background maps are Classic references; Forever terrain alignment is unverified.

Density update 2026-11-15: 4,953 cells on 40/42 maps; Mob Level Map 1.0.7 with per-cell Classic/Forever origin. All 19 new Drive files audited. See DENSITY_UPDATE.md.
