# Draw Generators

Приложение для генерации Dive Pool соревнований `D2W & D4W` и `DS`.

## Возможности
- Генерация для `D2W & D4W`, `DS` и совместного режима `DS + D2W`.
- Отдельные наборы элементов в popup-настройках для каждой дисциплины.
- Сохранение сессии:
  - выбранные дисциплины;
  - количество раундов по каждой дисциплине;
  - выбранные элементы;
  - последний сгенерированный результат.
- Экспорт результата в PDF:
  - альбомная ориентация;
  - стандартные поля;
  - в dual-режиме каждая дисциплина печатается на отдельном листе.

## Стек
- Python 3.10+
- PySide6
- Pytest
- PyInstaller

## Быстрый старт
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## Тесты
```bash
python -m pytest -q
```

## Сборка EXE
```bash
python -m PyInstaller --onefile --windowed --name DrawGeneratorsApp main.py
```

Результат сборки: `dist/DrawGeneratorsApp.exe`

## Внешний конфиг
При старте приложение ищет `DrawGenerators.cfg` в текущей директории.
- Если файла нет: создаёт его с параметрами по умолчанию.
- Если файл есть: берёт из него uppercase-переменные.

### Ключевые переменные в `DrawGenerators.cfg`
- `DEFAULT_COMPETITION` — дисциплина по умолчанию (`D2W_D4W` или `DS`).
- `COMPETITIONS` — словарь дисциплин и их пулов элементов:
  - `title`
  - `snakes`
  - `verticals`
  - `mixers`

Пример структуры:
```python
DEFAULT_COMPETITION = "D2W_D4W"
COMPETITIONS = {
    "D2W_D4W": {
        "title": "D2W & D4W",
        "snakes": [...],
        "verticals": [...],
        "mixers": [...],
    },
    "DS": {
        "title": "DS",
        "snakes": [...],
        "verticals": [...],
        "mixers": [...],
    },
}
```

## UI: выбор дисциплин
- Дисциплины выбираются чекбоксами в шапке popup-настроек.
- Нельзя снять оба чекбокса: как минимум одна дисциплина всегда остается активной.

## Документация
- `docs/ARCHITECTURE.md` — архитектура и flow
- `docs/CONFIG.md` — настройки в `config.py`
- `tests/TESTCASES.md` — ручные тест-кейсы
