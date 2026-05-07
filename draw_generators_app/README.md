# Draw Generators

Приложение для генерации Dive Pool соревнований D2W и D4W.

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

## Документация
- `docs/ARCHITECTURE.md` — архитектура и flow
- `docs/CONFIG.md` — настройки в `config.py`
- `tests/TESTCASES.md` — ручные тест-кейсы
