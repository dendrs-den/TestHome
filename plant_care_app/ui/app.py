from __future__ import annotations

import tkinter as tk
from datetime import datetime
from tkinter import messagebox, ttk

from tkcalendar import Calendar

from services.storage import StorageService, ValidationError


class PlantCareApp(tk.Tk):
    def __init__(self, storage: StorageService) -> None:
        super().__init__()
        self.storage = storage
        self.title("Уход за растениями")
        self.geometry("920x600")

        self.selected_plant_id: tk.IntVar = tk.IntVar(value=0)

        self._build_ui()
        self.refresh_all()

    def _build_ui(self) -> None:
        left = ttk.Frame(self, padding=12)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        right = ttk.Frame(self, padding=12)
        right.pack(side=tk.RIGHT, fill=tk.Y)

        self.calendar = Calendar(left, selectmode="day", date_pattern="yyyy-mm-dd")
        self.calendar.tag_config("watering_day_light", background="#dff3e1", foreground="#1f5f2a")
        self.calendar.tag_config("watering_day_heavy", background="#8fd19e", foreground="#103b1a")
        self.calendar.pack(fill=tk.BOTH, expand=True)
        self.calendar.bind("<<CalendarSelected>>", lambda _evt: self._refresh_day_records())

        self.records_box = tk.Text(left, height=8, state="disabled")
        self.records_box.pack(fill=tk.X, pady=(12, 0))

        ttk.Label(right, text="Добавить растение").pack(anchor="w")
        self.plant_name_entry = ttk.Entry(right, width=35)
        self.plant_name_entry.pack(anchor="w", pady=(4, 6))

        self.plant_note_entry = ttk.Entry(right, width=35)
        self.plant_note_entry.pack(anchor="w", pady=(0, 6))
        self.plant_note_entry.insert(0, "Заметка (опционально)")

        ttk.Button(right, text="Сохранить растение", command=self._add_plant).pack(anchor="w", pady=(0, 14))

        ttk.Separator(right).pack(fill=tk.X, pady=(0, 12))

        ttk.Label(right, text="Добавить полив").pack(anchor="w")
        self.plant_combo = ttk.Combobox(right, width=32, state="readonly")
        self.plant_combo.pack(anchor="w", pady=(4, 6))

        self.time_entry = ttk.Entry(right, width=35)
        self.time_entry.insert(0, "18:30")
        self.time_entry.pack(anchor="w", pady=(0, 6))

        ttk.Button(right, text="Сохранить полив", command=self._add_watering).pack(anchor="w")

        ttk.Separator(right).pack(fill=tk.X, pady=12)

        ttk.Label(right, text="Список растений").pack(anchor="w")
        self.plants_list = tk.Listbox(right, width=38, height=15)
        self.plants_list.pack(anchor="w", fill=tk.X)

    def refresh_all(self) -> None:
        self._refresh_plant_controls()
        self._refresh_calendar_markers()
        self._refresh_day_records()

    def _refresh_calendar_markers(self) -> None:
        self.calendar.calevent_remove("all")
        grouped: dict[str, list[str]] = {}
        for rec in self.storage.watering:
            grouped.setdefault(rec.date, []).append(rec.time)

        for date_str, times in grouped.items():
            day = datetime.strptime(date_str, "%Y-%m-%d").date()
            marker_text = f"🌸 Поливов: {len(times)}"
            tag = "watering_day_heavy" if len(times) >= 2 else "watering_day_light"
            self.calendar.calevent_create(day, marker_text, tag)

    def _refresh_plant_controls(self) -> None:
        self.plants_list.delete(0, tk.END)
        combo_values: list[str] = []
        for plant in self.storage.plants:
            line = f"#{plant.id} {plant.name}"
            if plant.note:
                line += f" - {plant.note}"
            self.plants_list.insert(tk.END, line)
            combo_values.append(f"{plant.id}: {plant.name}")
        self.plant_combo["values"] = combo_values
        if combo_values:
            self.plant_combo.current(0)

    def _refresh_day_records(self) -> None:
        selected_date = self.calendar.get_date()
        records = [r for r in self.storage.watering if r.date == selected_date]
        self.records_box.configure(state="normal")
        self.records_box.delete("1.0", tk.END)
        if not records:
            self.records_box.insert(tk.END, f"На {selected_date} поливов нет")
        else:
            for rec in sorted(records, key=lambda x: x.time):
                name = self.storage.get_plant_name(rec.plant_id)
                self.records_box.insert(tk.END, f"{rec.time} - {name}\n")
        self.records_box.configure(state="disabled")

    def _add_plant(self) -> None:
        try:
            self.storage.add_plant(self.plant_name_entry.get(), self.plant_note_entry.get())
        except ValidationError as exc:
            messagebox.showerror("Ошибка", str(exc))
            return
        self.plant_name_entry.delete(0, tk.END)
        self.plant_note_entry.delete(0, tk.END)
        self.refresh_all()

    def _add_watering(self) -> None:
        if not self.plant_combo.get():
            messagebox.showerror("Ошибка", "Сначала добавьте растение")
            return

        selected = self.plant_combo.get().split(":", 1)[0]
        plant_id = int(selected)
        date = self.calendar.get_date()
        time = self.time_entry.get().strip()

        try:
            self.storage.add_watering(plant_id, date, time)
        except ValidationError as exc:
            messagebox.showerror("Ошибка", str(exc))
            return
        self.refresh_all()


def run_app(storage: StorageService) -> None:
    app = PlantCareApp(storage)
    app.mainloop()
