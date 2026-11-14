WoW Forever Maps — версия 3.4, этап 4.

Для публикации загрузите файлы сайта и папку maps на статический хостинг.
Главная: index.html, app-core.js, resources.js, settings.js, home.js, data.json, forever-theme.css, hero-v4.css и изображения фона.
Атлас: atlas.html, app-core.js, resources.js, settings.js, atlas.js, data.json, forever-theme.css, login-gates.jpg и maps/.
data.js обеспечивает прямое открытие локальных файлов; он должен соответствовать data.json.
coverage.json документирует покрытие локаций. GitHub Actions проверяет данные и интерфейс перед публикацией.

Подбор до пяти локаций: сортировка по сумме индексов плотности ячеек подходящих уровней.
Число близких рудных точек показано отдельно и используется при равной плотности.
Рекомендации не являются проверенными маршрутами или оценкой XP/hour.
Травы отображаются отдельным слоем в атласе и не меняют формулу ранжирования.
Игровое совмещение координат ресурсов не проверено.

Перед публикацией: python tools/build_data.py --check
Для пересборки: python tools/build_data.py
CI также проверяет восстановление настроек, оба режима отображения и ошибки данных.

Четыре цели подбора используют явные сортировки по плотности или числу подходящих записей.
Новые источники и ограничения: STAGE4_FIXES.md.

QuestieDB integration (2026-11-15): see QUESTIEDB_INTEGRATION.md.
Catalog: database.html. Optional NPC map layer; direct file atlas fallback retained.
Sources/terms: sources/questie/NOTICE.md. Rebuild: python tools/build_data.py --check
