from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class Plant:
    id: int
    name: str
    note: str = ""

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "note": self.note}


@dataclass(slots=True)
class WateringRecord:
    plant_id: int
    date: str  # YYYY-MM-DD
    time: str  # HH:MM

    def to_dict(self) -> dict:
        return {"plant_id": self.plant_id, "date": self.date, "time": self.time}
