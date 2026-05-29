# Handoff 2026-05-29 - Operator

## Текущая ветка
- `task/raspberry-old-operator-ui/restore-legacy-operator`

## Что завершено
- `Operator` переведен на shell в стиле `Concept A` для tournament-flow.
- `Tournament list` визуально выровнен:
  - единый центральный блок
  - локальные шрифты
  - выровненные `Open / Edit`
  - без лишнего внешнего скролла
- `Tournament management` переведен на `single-round view`:
  - слева stage-tabs вместо `Турниры / История`
  - в центре показывается только один активный раунд
  - `Back` возвращает в `Tournament list`
- Фрейм таблицы на странице управления раундом:
  - без outline
  - без скруглений
  - растягивается до footer
  - скролл появляется только при реальном переполнении
- `STOP` сохраняет результат в SQLite.
- `NEXT ROUND` пропускает уже завершенные заезды и останавливается сообщением `Раунд завершен`, если участников больше нет.

## Что проверено
- `apps/operator`
  - `npm exec tsc -- --noEmit`
  - `npm run build`
- Живой smoke-check:
  - `Tournament list`
  - `Open -> Tournament management`
  - переключение stage-tabs
  - `Back -> Tournament list`

## Что остается на завтра
- Дальнейшая точечная полировка `Tournament management`, если понадобятся еще визуальные правки.
- Продолжение приведения `Edit/Create tournament` к тому же визуальному ритму, если потребуется.
- При необходимости - отдельная чистка предупреждения `PaperProps paperprops` в `InitialPage`, если оно еще воспроизводится в dev-режиме.

## Стартовая точка на утро
- Стартовать из ветки:
  - `task/raspberry-old-operator-ui/restore-legacy-operator`
- Для dev-запуска:
  - `.\scripts\run_operator.ps1`
- Для desktop/Tauri:
  - `.\scripts\run_operator.ps1 -Tauri`
