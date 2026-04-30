from __future__ import annotations

from types import SimpleNamespace

import tkinter as tk

import ui.app as app_module
from models.entities import Plant, WateringRecord
from services.storage import ValidationError


class FakeCalendar:
    def __init__(self, selected_date: str = "2026-05-15") -> None:
        self.selected_date = selected_date
        self.events: list[tuple[object, str, str]] = []
        self.removed: list[str] = []
        self.tags: list[tuple[str, dict]] = []

    def get_date(self) -> str:
        return self.selected_date

    def calevent_remove(self, what: str) -> None:
        self.removed.append(what)

    def calevent_create(self, day, text: str, tag: str) -> None:
        self.events.append((day, text, tag))

    def tag_config(self, tag: str, **kwargs) -> None:
        self.tags.append((tag, kwargs))


class FakeText:
    def __init__(self) -> None:
        self.state_changes: list[str] = []
        self.contents = ""

    def configure(self, **kwargs) -> None:
        self.state_changes.append(kwargs.get("state", ""))

    def delete(self, _start: str, _end: str) -> None:
        self.contents = ""

    def insert(self, _where: str, text: str) -> None:
        self.contents += text


class FakeEntry:
    def __init__(self, value: str = "") -> None:
        self.value = value
        self.deleted_calls = 0

    def get(self) -> str:
        return self.value

    def delete(self, _start: int, _end) -> None:
        self.value = ""
        self.deleted_calls += 1


class FakeCombo:
    def __init__(self, value: str = "") -> None:
        self.value = value
        self.values: list[str] = []
        self.current_index: int | None = None

    def get(self) -> str:
        return self.value

    def __setitem__(self, key: str, value) -> None:
        if key == "values":
            self.values = value

    def current(self, index: int) -> None:
        self.current_index = index


class FakeListbox:
    def __init__(self) -> None:
        self.items: list[str] = []
        self.selected_index: int | None = None

    def delete(self, _start, _end) -> None:
        self.items = []

    def insert(self, _where, text: str) -> None:
        self.items.append(text)

    def curselection(self):
        if self.selected_index is None:
            return ()
        return (self.selected_index,)

    def get(self, index: int) -> str:
        return self.items[index]


class FakeStorage:
    def __init__(self) -> None:
        self.plants: list[Plant] = []
        self.watering: list[WateringRecord] = []
        self.fail_add_plant = False
        self.fail_add_watering = False
        self.added_plants: list[tuple[str, str]] = []
        self.added_watering: list[tuple[int, str, str]] = []

    def add_plant(self, name: str, note: str) -> None:
        if self.fail_add_plant:
            raise ValidationError("bad plant")
        self.added_plants.append((name, note))

    def add_watering(self, plant_id: int, date: str, time: str) -> None:
        if self.fail_add_watering:
            raise ValidationError("bad watering")
        self.added_watering.append((plant_id, date, time))

    def get_plant_name(self, plant_id: int) -> str:
        return {1: "Орхидея", 2: "Фикус"}.get(plant_id, "?")


def build_app(storage: FakeStorage | None = None):
    app = object.__new__(app_module.PlantCareApp)
    app.storage = storage or FakeStorage()
    app.calendar = FakeCalendar()
    app.records_box = FakeText()
    app.plant_name_entry = FakeEntry()
    app.plant_note_entry = FakeEntry()
    app.time_entry = FakeEntry("18:30")
    app.plant_combo = FakeCombo()
    app.plants_list = FakeListbox()
    app.day_records_list = FakeListbox()
    app._day_records = []
    app.refresh_all_calls = 0

    def refresh_all() -> None:
        app.refresh_all_calls += 1

    app.refresh_all = refresh_all
    return app


def test_refresh_calendar_markers_assigns_light_and_heavy_tags() -> None:
    storage = FakeStorage()
    storage.watering = [
        WateringRecord(1, "2026-05-15", "08:00"),
        WateringRecord(1, "2026-05-16", "09:00"),
        WateringRecord(2, "2026-05-16", "19:00"),
    ]
    app = build_app(storage)

    app_module.PlantCareApp._refresh_calendar_markers(app)

    assert app.calendar.removed == ["all"]
    tags = [event[2] for event in app.calendar.events]
    assert "watering_day_light" in tags
    assert "watering_day_heavy" in tags


def test_refresh_plant_controls_populates_list_and_combobox() -> None:
    storage = FakeStorage()
    storage.plants = [Plant(1, "Орхидея", ""), Plant(2, "Фикус", "Свет")]
    app = build_app(storage)

    app_module.PlantCareApp._refresh_plant_controls(app)

    assert app.plants_list.items == ["#1 Орхидея", "#2 Фикус - Свет"]
    assert app.plant_combo.values == ["1: Орхидея", "2: Фикус"]
    assert app.plant_combo.current_index == 0


def test_refresh_plant_controls_handles_empty_plants() -> None:
    app = build_app(FakeStorage())

    app_module.PlantCareApp._refresh_plant_controls(app)

    assert app.plant_combo.values == []
    assert app.plant_combo.current_index is None


def test_refresh_day_records_no_records() -> None:
    app = build_app(FakeStorage())

    app_module.PlantCareApp._refresh_day_records(app)

    assert "поливов нет" in app.records_box.contents
    assert app.records_box.state_changes == ["normal", "disabled"]


def test_refresh_day_records_sorted_output() -> None:
    storage = FakeStorage()
    storage.watering = [
        WateringRecord(1, "2026-05-15", "20:00"),
        WateringRecord(2, "2026-05-15", "08:30"),
    ]
    app = build_app(storage)

    app_module.PlantCareApp._refresh_day_records(app)

    assert app.records_box.contents.startswith("08:30 - Фикус")
    assert "20:00 - Орхидея" in app.records_box.contents


def test_add_plant_success() -> None:
    app = build_app(FakeStorage())
    app.plant_name_entry = FakeEntry("Орхидея")
    app.plant_note_entry = FakeEntry("Окно")

    app_module.PlantCareApp._add_plant(app)

    assert app.storage.added_plants == [("Орхидея", "Окно")]
    assert app.plant_name_entry.deleted_calls == 1
    assert app.plant_note_entry.deleted_calls == 1
    assert app.refresh_all_calls == 1


def test_add_plant_validation_error(monkeypatch) -> None:
    storage = FakeStorage()
    storage.fail_add_plant = True
    app = build_app(storage)
    errors: list[tuple[str, str]] = []
    monkeypatch.setattr(app_module.messagebox, "showerror", lambda title, msg: errors.append((title, msg)))

    app_module.PlantCareApp._add_plant(app)

    assert errors == [("Ошибка", "bad plant")]
    assert app.refresh_all_calls == 0


def test_add_watering_requires_plant(monkeypatch) -> None:
    app = build_app(FakeStorage())
    errors: list[tuple[str, str]] = []
    monkeypatch.setattr(app_module.messagebox, "showerror", lambda title, msg: errors.append((title, msg)))

    app_module.PlantCareApp._add_watering(app)

    assert errors == [("Ошибка", "Сначала добавьте растение")]


def test_add_watering_validation_error(monkeypatch) -> None:
    storage = FakeStorage()
    storage.fail_add_watering = True
    app = build_app(storage)
    app.plant_combo = FakeCombo("1: Орхидея")
    app.time_entry = FakeEntry("12:00")
    errors: list[tuple[str, str]] = []
    monkeypatch.setattr(app_module.messagebox, "showerror", lambda title, msg: errors.append((title, msg)))

    app_module.PlantCareApp._add_watering(app)

    assert errors == [("Ошибка", "bad watering")]
    assert app.refresh_all_calls == 0


def test_add_watering_success() -> None:
    app = build_app(FakeStorage())
    app.plant_combo = FakeCombo("2: Фикус")
    app.time_entry = FakeEntry("07:45")

    app_module.PlantCareApp._add_watering(app)

    assert app.storage.added_watering == [(2, "2026-05-15", "07:45")]
    assert app.refresh_all_calls == 1


def test_refresh_all_calls_all_parts() -> None:
    app = object.__new__(app_module.PlantCareApp)
    calls: list[str] = []
    app._refresh_plant_controls = lambda: calls.append("plants")
    app._refresh_calendar_markers = lambda: calls.append("markers")
    app._refresh_day_records = lambda: calls.append("records")

    app_module.PlantCareApp.refresh_all(app)

    assert calls == ["plants", "markers", "records"]


def test_run_app_calls_mainloop(monkeypatch) -> None:
    called = {"mainloop": False}

    class DummyApp:
        def __init__(self, _storage) -> None:
            pass

        def mainloop(self) -> None:
            called["mainloop"] = True

    monkeypatch.setattr(app_module, "PlantCareApp", DummyApp)
    app_module.run_app(SimpleNamespace())
    assert called["mainloop"] is True


def test_init_calls_ui_build_and_refresh(monkeypatch) -> None:
    monkeypatch.setattr(tk.Tk, "__init__", lambda self: None)
    monkeypatch.setattr(tk.Tk, "title", lambda self, _t: None)
    monkeypatch.setattr(tk.Tk, "geometry", lambda self, _g: None)

    class DummyIntVar:
        def __init__(self, value=0):
            self.value = value

    monkeypatch.setattr(app_module.tk, "IntVar", DummyIntVar)

    called = {"build": 0, "refresh": 0}
    monkeypatch.setattr(app_module.PlantCareApp, "_set_window_icon", lambda self: None)
    monkeypatch.setattr(app_module.PlantCareApp, "_build_ui", lambda self: called.__setitem__("build", called["build"] + 1))
    monkeypatch.setattr(app_module.PlantCareApp, "refresh_all", lambda self: called.__setitem__("refresh", called["refresh"] + 1))

    app_module.PlantCareApp(SimpleNamespace())

    assert called == {"build": 1, "refresh": 1}


def test_build_ui_creates_widgets_and_binds(monkeypatch) -> None:
    created_buttons = []

    class DummyFrame:
        def __init__(self, *_args, **_kwargs):
            pass

        def pack(self, **_kwargs):
            pass

    class DummyLabel:
        def __init__(self, *_args, **_kwargs):
            pass

        def pack(self, **_kwargs):
            pass

    class DummyEntry:
        def __init__(self, *_args, **_kwargs):
            self.inserted = []

        def pack(self, **_kwargs):
            pass

        def insert(self, idx, txt):
            self.inserted.append((idx, txt))

        def get(self):
            return ""

        def delete(self, _s, _e):
            pass

    class DummyButton:
        def __init__(self, *_args, **kwargs):
            created_buttons.append(kwargs.get("command"))

        def pack(self, **_kwargs):
            pass

    class DummySeparator:
        def __init__(self, *_args, **_kwargs):
            pass

        def pack(self, **_kwargs):
            pass

    class DummyCombobox(FakeCombo):
        def __init__(self, *_args, **_kwargs):
            super().__init__("")

        def pack(self, **_kwargs):
            pass

    class DummyText(FakeText):
        def __init__(self, *_args, **_kwargs):
            super().__init__()

        def pack(self, **_kwargs):
            pass

    class DummyListbox(FakeListbox):
        def __init__(self, *_args, **_kwargs):
            super().__init__()

        def pack(self, **_kwargs):
            pass

    class DummyCalendar(FakeCalendar):
        def __init__(self, *_args, **_kwargs):
            super().__init__()
            self.bound = []
            self.packed = False

        def pack(self, **_kwargs):
            self.packed = True

        def bind(self, event, _callback):
            self.bound.append(event)

    monkeypatch.setattr(app_module.ttk, "Frame", DummyFrame)
    monkeypatch.setattr(app_module.ttk, "Label", DummyLabel)
    monkeypatch.setattr(app_module.ttk, "Entry", DummyEntry)
    monkeypatch.setattr(app_module.ttk, "Button", DummyButton)
    monkeypatch.setattr(app_module.ttk, "Separator", DummySeparator)
    monkeypatch.setattr(app_module.ttk, "Combobox", DummyCombobox)
    monkeypatch.setattr(app_module.tk, "Text", DummyText)
    monkeypatch.setattr(app_module.tk, "Listbox", DummyListbox)
    monkeypatch.setattr(app_module, "Calendar", DummyCalendar)

    app = object.__new__(app_module.PlantCareApp)
    app.storage = FakeStorage()

    app_module.PlantCareApp._build_ui(app)

    assert isinstance(app.calendar, DummyCalendar)
    assert set(tag for tag, _ in app.calendar.tags) == {"watering_day_light", "watering_day_heavy"}
    assert "<<CalendarSelected>>" in app.calendar.bound
    assert callable(created_buttons[0])
    assert callable(created_buttons[1])


def test_set_window_icon_prefers_ico_and_png(monkeypatch, tmp_path) -> None:
    app = object.__new__(app_module.PlantCareApp)

    assets = tmp_path / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    ico = assets / "app_icon.ico"
    png = assets / "app_icon.png"
    ico.write_bytes(b"00")
    png.write_bytes(b"00")

    calls = {"iconbitmap": None, "iconphoto": False}

    monkeypatch.setattr(app_module.sys, "_MEIPASS", str(tmp_path), raising=False)
    monkeypatch.setattr(app_module.tk, "PhotoImage", lambda file: object())

    app.iconbitmap = lambda path: calls.__setitem__("iconbitmap", path)
    app.iconphoto = lambda _default, _img: calls.__setitem__("iconphoto", True)

    app_module.PlantCareApp._set_window_icon(app)

    assert str(ico) == calls["iconbitmap"]
    assert calls["iconphoto"] is True


def test_delete_selected_plant_success() -> None:
    storage = FakeStorage()
    storage.plants = [Plant(1, "???????", ""), Plant(2, "?????", "")]
    storage.delete_plant = lambda plant_id: storage.plants.pop(0)
    app = build_app(storage)
    app.plants_list.items = ["#1 ???????", "#2 ?????"]
    app.plants_list.selected_index = 0

    app_module.PlantCareApp._delete_selected_plant(app)

    assert app.refresh_all_calls == 1


def test_delete_selected_watering_success() -> None:
    storage = FakeStorage()
    called = {"args": None}

    def delete_watering(plant_id, date, time):
        called["args"] = (plant_id, date, time)

    storage.delete_watering = delete_watering
    app = build_app(storage)
    app._day_records = [(2, "2026-05-15", "08:30")]
    app.day_records_list.items = ["08:30 - ?????"]
    app.day_records_list.selected_index = 0

    app_module.PlantCareApp._delete_selected_watering(app)

    assert called["args"] == (2, "2026-05-15", "08:30")
    assert app.refresh_all_calls == 1
