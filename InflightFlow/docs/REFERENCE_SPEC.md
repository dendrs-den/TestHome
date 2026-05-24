# Референс-спецификация - inFight -> InflightFlow

`inFight_pi_snapshot` — это источник референсного поведения для InflightFlow.

## Что берем как референс
- Правила домена турнира и переходы состояний
- Поведение тайминга/скоринга
- Операторские workflow и последовательность экранов
- Семантику hardware-команд для DMX и пайплайна датчика

## Что не переносим напрямую
- Легаси-структуру server/runtime
- Легаси-транспорт (например, longpoll)
- Легаси-скрипты упаковки и деплоя «как есть»

## Треки извлечения референса

### R0 - Референс доменного поведения
Источник:
- `src_frontend/server/routes/tournaments.js`
- `src_frontend/server/routes/stages.js`
- `src_frontend/server/routes/rounds.js`
- `src_frontend/server/routes/teams.js`
- `src_frontend/server/routes/disciplines.js`
- `src_frontend/server/routes/actions.js`

Цель:
- Формальная спецификация command/state-machine в `apps/core`

### R1 - Референс UX оператора
Источник:
- `src_frontend/client/src/Components/*`
- `src_frontend/client/src/Sections/*`

Цель:
- Эквивалентные operator-flow в `apps/operator` (Tauri + React)

### R2 - Референс поведения железа
Источник:
- Существующие bluetooth/sensor/DMX-related route и runtime artifacts

Цель:
- Стабильные адаптеры в `apps/core` с режимами real/mock и guard-механизмами надежности

## Критерии приемки паритета с референсом
- Поведение жизненного цикла турнира соответствует референсным сценариям
- Выходы тайминга/скоринга совпадают с ожидаемыми
- Последовательности hardware-команд сохраняют нужную семантику
- Оператор может выполнять процедуры соревнования при эквивалентном UX-flow
