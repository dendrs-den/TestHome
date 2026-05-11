# Flyer Generators

Приложение для случайного распределения участников соревнований по командам на каждый раунд.

## Возможности
- Генерация `N` команд для каждого раунда (в зависимости от числа участников и `Team Size`).
- Настройка количества раундов в popup-настройках.
- Управление списком участников в popup:
  - добавление;
  - редактирование;
  - удаление.
- Формат участника: `трехзначный номер` + `ФИО`.
- Режим `Captain` с фиксированным назначением капитанов по номеру.
- Анимация генерации результатов.
- Сохранение настроек и списка участников между сессиями.
- Экспорт последнего результата в PDF.

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
python -m PyInstaller --onefile --windowed --name FlyerGeneratorsApp main.py
```

## Внешний конфиг
При старте приложение ищет `FlyerGenerators.cfg` в текущей директории:
- если файла нет, создаёт его со значениями по умолчанию;
- если файл есть, применяет uppercase-переменные.

Ключевые переменные:
- `APP_TITLE_TEXT`
- `ANIMATION_STEP_DELAY_MS`
- `ANIMATION_STEP_COUNT`
- `DEFAULT_ROUND_COUNT`
- `MAX_ROUND_COUNT`
