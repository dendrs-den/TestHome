"""Validation functions for input checks."""


def validate_round_count(round_count: int) -> None:
    """Ensure rounds count is positive."""
    if round_count < 1:
        raise ValueError("Rounds count must be at least 1.")


def validate_group_selection(group_name: str, selected_count: int) -> None:
    """Ensure at least one element is selected in a group."""
    if selected_count < 1:
        raise ValueError(f"Select at least one element in {group_name}.")
