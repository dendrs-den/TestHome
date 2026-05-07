"""Reusable widgets for element selection."""

from __future__ import annotations

from PySide6.QtWidgets import QCheckBox, QGroupBox, QVBoxLayout

from core.models import Element


class ElementGroupWidget(QGroupBox):
    """Checkbox group for one element category."""

    def __init__(self, title: str, elements: list[Element]) -> None:
        super().__init__(title)
        self._map: dict[QCheckBox, Element] = {}
        layout = QVBoxLayout()

        for element in elements:
            checkbox = QCheckBox(f"{element.code} - {element.name}")
            checkbox.setChecked(True)
            self._map[checkbox] = element
            layout.addWidget(checkbox)

        self.setLayout(layout)

    def selected_elements(self) -> list[Element]:
        """Return all currently selected elements."""
        return [element for checkbox, element in self._map.items() if checkbox.isChecked()]

    def selected_codes(self) -> list[str]:
        """Return codes of all selected elements."""
        return [element.code for element in self.selected_elements()]

    def apply_selected_codes(self, codes: list[str]) -> None:
        """Apply saved selection by element codes."""
        codes_set = set(codes)
        for checkbox, element in self._map.items():
            checkbox.setChecked(element.code in codes_set)

    def reset_selection(self) -> None:
        """Select all checkboxes again."""
        for checkbox in self._map:
            checkbox.setChecked(True)
