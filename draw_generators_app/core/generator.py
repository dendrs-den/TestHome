"""Draw generation algorithm implementation."""

from __future__ import annotations

import random
from typing import Sequence

from core.models import Element, Round
from core.validators import validate_group_selection, validate_round_count


def _expand_to_round_count(items: Sequence[Element], round_count: int) -> list[Element]:
    """Repeat list until it reaches required rounds count, then cut extra."""
    result: list[Element] = []
    while len(result) < round_count:
        result.extend(items)
    return result[:round_count]


def _shuffle_copy(items: Sequence[Element], rng: random.Random | None = None) -> list[Element]:
    """Create and shuffle a copy to keep original order untouched."""
    shuffled = list(items)
    (rng or random).shuffle(shuffled)
    return shuffled


def generate_rounds(
    round_count: int,
    snakes: Sequence[Element],
    verticals: Sequence[Element],
    mixers: Sequence[Element],
    rng: random.Random | None = None,
) -> list[Round]:
    """Generate rounds according to the specification.

    Each round contains exactly one element from Snakes, Verticals and Mixers.
    """
    validate_round_count(round_count)
    validate_group_selection("Snakes", len(snakes))
    validate_group_selection("Verticals", len(verticals))
    validate_group_selection("Mixers", len(mixers))

    snakes_pool = _shuffle_copy(_expand_to_round_count(snakes, round_count), rng)
    verticals_pool = _shuffle_copy(_expand_to_round_count(verticals, round_count), rng)
    mixers_pool = _shuffle_copy(_expand_to_round_count(mixers, round_count), rng)

    rounds: list[Round] = []
    for index in range(round_count):
        rounds.append(
            Round(
                number=index + 1,
                snake=snakes_pool[index],
                vertical=verticals_pool[index],
                mixer=mixers_pool[index],
            )
        )
    return rounds
