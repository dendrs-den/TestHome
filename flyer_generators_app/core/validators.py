"""Validation functions for input checks."""

from __future__ import annotations

from core.models import Participant


def validate_round_count(round_count: int) -> None:
    """Ensure rounds count is positive."""
    if round_count < 1:
        raise ValueError("Количество раундов должно быть не меньше 1.")


def validate_participants(participants: list[Participant]) -> None:
    """Ensure participant list can be split into teams."""
    if len(participants) < 2:
        raise ValueError("Добавьте минимум 2 участников.")


def validate_team_size(team_size: int) -> None:
    """Ensure team size is in supported range."""
    if team_size < 1 or team_size > 4:
        raise ValueError("Размер команды должен быть от 1 до 4.")


def validate_participant(number: str, full_name: str, existing_numbers: set[str] | None = None) -> None:
    """Validate one participant form before add/edit."""
    if len(number) != 3 or not number.isdigit():
        raise ValueError("Номер участника должен состоять из 3 цифр.")
    if not full_name.strip():
        raise ValueError("Поле имени обязательно для заполнения.")
    if existing_numbers is not None and number in existing_numbers:
        raise ValueError("Номер участника должен быть уникальным.")
