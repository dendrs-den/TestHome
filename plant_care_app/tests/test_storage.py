from __future__ import annotations

import json
from pathlib import Path

import pytest

from services.storage import StorageService, ValidationError


@pytest.fixture()
def data_file(tmp_path: Path) -> Path:
    path = tmp_path / "data.json"
    path.write_text(json.dumps({"plants": [], "watering": []}, ensure_ascii=False), encoding="utf-8")
    return path


def test_add_plant_assigns_incremental_id(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()

    first = storage.add_plant("Орхидея")
    second = storage.add_plant("Фикус", "Любит свет")

    assert first.id == 1
    assert second.id == 2
    assert len(storage.plants) == 2


def test_add_watering_saves_record(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()
    plant = storage.add_plant("Орхидея")

    rec = storage.add_watering(plant.id, "2026-05-15", "18:30")

    assert rec.plant_id == plant.id
    assert rec.date == "2026-05-15"
    assert rec.time == "18:30"


def test_add_watering_validates_time(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()
    plant = storage.add_plant("Орхидея")

    with pytest.raises(ValidationError):
        storage.add_watering(plant.id, "2026-05-15", "25:99")


def test_load_rejects_invalid_json(tmp_path: Path) -> None:
    path = tmp_path / "data.json"
    path.write_text("{oops}", encoding="utf-8")

    storage = StorageService(path)
    with pytest.raises(ValidationError):
        storage.load()


def test_load_accepts_utf8_bom_json(tmp_path: Path) -> None:
    path = tmp_path / "data.json"
    path.write_bytes(b"\xef\xbb\xbf{\"plants\": [], \"watering\": []}")

    storage = StorageService(path)
    storage.load()

    assert storage.plants == []
    assert storage.watering == []


def test_add_plant_validates_non_empty_name(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()

    with pytest.raises(ValidationError):
        storage.add_plant("   ")


def test_add_watering_rejects_unknown_plant(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()

    with pytest.raises(ValidationError):
        storage.add_watering(999, "2026-05-15", "12:00")


def test_add_watering_validates_date(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()
    plant = storage.add_plant("???????")

    with pytest.raises(ValidationError):
        storage.add_watering(plant.id, "15-05-2026", "12:00")


def test_get_plant_name_returns_fallback(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()

    assert storage.get_plant_name(12345).startswith("(")
    assert storage.get_plant_name(12345).endswith(")")
    assert storage.get_plant_name(12345) != ""


def test_load_creates_file_if_missing(tmp_path: Path) -> None:
    path = tmp_path / "nested" / "data.json"
    storage = StorageService(path)

    storage.load()

    assert path.exists() is True
    assert storage.plants == []
    assert storage.watering == []


def test_load_rejects_invalid_watering_date(tmp_path: Path) -> None:
    path = tmp_path / "data.json"
    path.write_text(
        json.dumps({
            "plants": [{"id": 1, "name": "???????", "note": ""}],
            "watering": [{"plant_id": 1, "date": "05-15-2026", "time": "12:00"}]
        }, ensure_ascii=False),
        encoding="utf-8",
    )

    storage = StorageService(path)
    with pytest.raises(ValidationError):
        storage.load()


def test_load_rejects_invalid_watering_time(tmp_path: Path) -> None:
    path = tmp_path / "data.json"
    path.write_text(
        json.dumps({
            "plants": [{"id": 1, "name": "???????", "note": ""}],
            "watering": [{"plant_id": 1, "date": "2026-05-15", "time": "99:99"}]
        }, ensure_ascii=False),
        encoding="utf-8",
    )

    storage = StorageService(path)
    with pytest.raises(ValidationError):
        storage.load()


def test_get_plant_name_returns_existing_name(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()
    plant = storage.add_plant("?????")

    assert storage.get_plant_name(plant.id) == "?????"


def test_delete_plant_removes_related_watering(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()
    p1 = storage.add_plant("???????")
    p2 = storage.add_plant("?????")
    storage.add_watering(p1.id, "2026-05-15", "10:00")
    storage.add_watering(p2.id, "2026-05-15", "11:00")

    storage.delete_plant(p1.id)

    assert all(p.id != p1.id for p in storage.plants)
    assert all(w.plant_id != p1.id for w in storage.watering)


def test_delete_watering_removes_only_selected_record(data_file: Path) -> None:
    storage = StorageService(data_file)
    storage.load()
    p1 = storage.add_plant("???????")
    storage.add_watering(p1.id, "2026-05-15", "10:00")
    storage.add_watering(p1.id, "2026-05-15", "11:00")

    storage.delete_watering(p1.id, "2026-05-15", "10:00")

    assert len(storage.watering) == 1
    assert storage.watering[0].time == "11:00"
