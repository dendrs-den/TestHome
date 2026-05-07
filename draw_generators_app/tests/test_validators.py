import pytest

from core.validators import validate_group_selection, validate_round_count


def test_validate_round_count_ok() -> None:
    validate_round_count(1)


def test_validate_round_count_error() -> None:
    with pytest.raises(ValueError):
        validate_round_count(0)


def test_validate_group_selection_error() -> None:
    with pytest.raises(ValueError):
        validate_group_selection("Mixers", 0)
