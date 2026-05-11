"""Helper functions for participant formatting."""

from __future__ import annotations

from core.models import Participant, TeamRound


def format_participant(item: Participant) -> str:
    """Return participant string for UI and export."""
    return f"{item.number} {item.full_name}"


def format_rounds(rounds: list[TeamRound]) -> str:
    """Format generated rounds to plain text."""
    lines: list[str] = []
    for value in rounds:
        lines.append(f"Round {value.number}:")
        for idx, team in enumerate(value.teams):
            lines.append(f"Team {idx + 1}: {', '.join(format_participant(x) for x in team)}")
        lines.append("")
    return "\n".join(lines).strip()
