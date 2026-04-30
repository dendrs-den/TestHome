from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from models.entities import Plant, WateringRecord


class ValidationError(ValueError):
    pass


class StorageService:
    def __init__(self, data_path: str | Path) -> None:
        self.data_path = Path(data_path)
        self.plants: list[Plant] = []
        self.watering: list[WateringRecord] = []

    def load(self) -> None:
        if not self.data_path.exists():
            self._save_raw({"plants": [], "watering": []})
        try:
            payload = json.loads(self.data_path.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError as exc:
            raise ValidationError(f"Некорректный JSON: {exc}") from exc

        plants_raw = payload.get("plants", [])
        watering_raw = payload.get("watering", [])

        self.plants = [
            Plant(
                id=int(item["id"]),
                name=str(item["name"]),
                note=str(item.get("note", "")),
            )
            for item in plants_raw
        ]
        self.watering = [
            WateringRecord(
                plant_id=int(item["plant_id"]),
                date=str(item["date"]),
                time=str(item["time"]),
            )
            for item in watering_raw
        ]

        for rec in self.watering:
            self._validate_date(rec.date)
            self._validate_time(rec.time)

    def save(self) -> None:
        payload = {
            "plants": [p.to_dict() for p in self.plants],
            "watering": [w.to_dict() for w in self.watering],
        }
        self._save_raw(payload)

    def add_plant(self, name: str, note: str = "") -> Plant:
        cleaned = name.strip()
        if not cleaned:
            raise ValidationError("Название растения не может быть пустым")

        next_id = max((p.id for p in self.plants), default=0) + 1
        plant = Plant(id=next_id, name=cleaned, note=note.strip())
        self.plants.append(plant)
        self.save()
        return plant

    def add_watering(self, plant_id: int, date: str, time: str) -> WateringRecord:
        if not any(p.id == plant_id for p in self.plants):
            raise ValidationError("Выбрано несуществующее растение")

        self._validate_date(date)
        self._validate_time(time)

        record = WateringRecord(plant_id=plant_id, date=date, time=time)
        self.watering.append(record)
        self.save()
        return record

    def delete_plant(self, plant_id: int) -> None:
        if not any(p.id == plant_id for p in self.plants):
            raise ValidationError("Растение не найдено")
        self.plants = [p for p in self.plants if p.id != plant_id]
        self.watering = [w for w in self.watering if w.plant_id != plant_id]
        self.save()

    def delete_watering(self, plant_id: int, date: str, time: str) -> None:
        original_len = len(self.watering)
        self.watering = [
            w
            for w in self.watering
            if not (w.plant_id == plant_id and w.date == date and w.time == time)
        ]
        if len(self.watering) == original_len:
            raise ValidationError("Запись полива не найдена")
        self.save()

    def get_plant_name(self, plant_id: int) -> str:
        for plant in self.plants:
            if plant.id == plant_id:
                return plant.name
        return "(неизвестное растение)"

    @staticmethod
    def _validate_date(value: str) -> None:
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError as exc:
            raise ValidationError("Дата должна быть в формате YYYY-MM-DD") from exc

    @staticmethod
    def _validate_time(value: str) -> None:
        try:
            datetime.strptime(value, "%H:%M")
        except ValueError as exc:
            raise ValidationError("Время должно быть в формате HH:MM") from exc

    def _save_raw(self, payload: dict[str, Any]) -> None:
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        self.data_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
