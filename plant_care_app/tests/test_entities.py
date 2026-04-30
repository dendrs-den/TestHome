from __future__ import annotations

from models.entities import Plant, WateringRecord


def test_plant_to_dict() -> None:
    plant = Plant(id=3, name="Монстера", note="Тень")
    assert plant.to_dict() == {"id": 3, "name": "Монстера", "note": "Тень"}


def test_watering_record_to_dict() -> None:
    rec = WateringRecord(plant_id=3, date="2026-05-01", time="09:15")
    assert rec.to_dict() == {"plant_id": 3, "date": "2026-05-01", "time": "09:15"}
