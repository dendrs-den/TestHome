from __future__ import annotations

import random

import pytest

from core.generator import _expand_to_round_count, generate_rounds
from core.models import Element


def test_expand_to_round_count_repeats_source() -> None:
    source = [Element("S1", "Snake 1"), Element("S2", "Snake 2")]
    result = _expand_to_round_count(source, 5)

    assert result == [source[0], source[1], source[0], source[1], source[0]]


def test_generate_rounds_returns_exact_count() -> None:
    rounds = generate_rounds(
        4,
        [Element("S1", "Snake")],
        [Element("V1", "Vertical")],
        [Element("M1", "Mixer")],
        rng=random.Random(10),
    )

    assert len(rounds) == 4
    assert [item.number for item in rounds] == [1, 2, 3, 4]


def test_generate_rounds_is_reproducible_with_seed() -> None:
    snakes = [Element("S1", "Snake 1"), Element("S2", "Snake 2")]
    verticals = [Element("V1", "Vertical 1"), Element("V2", "Vertical 2")]
    mixers = [Element("M1", "Mixer 1"), Element("M2", "Mixer 2")]

    first = generate_rounds(6, snakes, verticals, mixers, rng=random.Random(7))
    second = generate_rounds(6, snakes, verticals, mixers, rng=random.Random(7))

    assert first == second


def test_generate_rounds_rejects_invalid_round_count() -> None:
    with pytest.raises(ValueError, match="at least 1"):
        generate_rounds(0, [Element("S1", "Snake")], [Element("V1", "Vertical")], [Element("M1", "Mixer")])


def test_generate_rounds_rejects_empty_group() -> None:
    with pytest.raises(ValueError, match="Snakes"):
        generate_rounds(1, [], [Element("V1", "Vertical")], [Element("M1", "Mixer")])
