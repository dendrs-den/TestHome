"""Helper functions for transformations and formatting."""

from __future__ import annotations

from typing import Iterable

from core.models import Element, Round


def tuples_to_elements(items: Iterable[tuple[str, str]]) -> list[Element]:
    """Convert tuple values from config.py into domain objects."""
    return [Element(code=code, name=name) for code, name in items]


def format_rounds(rounds: list[Round]) -> str:
    """Format generated rounds to plain text for UI output."""
    lines: list[str] = []
    for value in rounds:
        lines.extend(
            [
                f"Round {value.number}:",
                f"- Snake: {value.snake.code} - {value.snake.name}",
                f"- Vertical: {value.vertical.code} - {value.vertical.name}",
                f"- Mixer: {value.mixer.code} - {value.mixer.name}",
                "",
            ]
        )
    return "\n".join(lines).strip()
