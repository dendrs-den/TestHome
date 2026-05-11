import pytest

from core.models import Participant
from core.validators import validate_participant, validate_participants, validate_round_count


def test_validate_round_count_ok() -> None:
    validate_round_count(1)


def test_validate_round_count_error() -> None:
    with pytest.raises(ValueError):
        validate_round_count(0)


def test_validate_round_count_too_large_error() -> None:
    with pytest.raises(ValueError, match="не больше 10"):
        validate_round_count(11)


def test_validate_participants_error() -> None:
    with pytest.raises(ValueError):
        validate_participants([Participant("001", "Only One")])


def test_validate_participant_number_error() -> None:
    with pytest.raises(ValueError, match="3 цифр"):
        validate_participant("12", "John")


def test_validate_participant_requires_name() -> None:
    with pytest.raises(ValueError, match="обязательно"):
        validate_participant("001", "   ")


def test_validate_participant_unique_number() -> None:
    with pytest.raises(ValueError, match="уникальным"):
        validate_participant("001", "John", {"001"})
