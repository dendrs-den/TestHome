from core.models import Element, Round
from utils.helpers import format_rounds, tuples_to_elements


def test_tuples_to_elements() -> None:
    assert tuples_to_elements([("A", "Alpha")]) == [Element("A", "Alpha")]


def test_format_rounds_contains_all_parts() -> None:
    text = format_rounds(
        [
            Round(
                number=1,
                snake=Element("S1", "Snake One"),
                vertical=Element("V1", "Vertical One"),
                mixer=Element("M1", "Mixer One"),
            )
        ]
    )

    assert "Round 1:" in text
    assert "Snake: S1 - Snake One" in text
    assert "Vertical: V1 - Vertical One" in text
    assert "Mixer: M1 - Mixer One" in text
