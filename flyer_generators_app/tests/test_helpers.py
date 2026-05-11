from core.models import Participant, TeamRound
from utils.helpers import format_participant, format_rounds


def test_format_participant() -> None:
    assert format_participant(Participant("001", "John Doe")) == "001 John Doe"


def test_format_rounds_contains_all_parts() -> None:
    text = format_rounds(
        [
            TeamRound(
                number=1,
                teams=[
                    [Participant("001", "John Doe")],
                    [Participant("002", "Jane Doe")],
                ],
            )
        ]
    )

    assert "Round 1:" in text
    assert "Team 1: 001 John Doe" in text
    assert "Team 2: 002 Jane Doe" in text
