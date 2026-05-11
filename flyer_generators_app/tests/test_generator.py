from __future__ import annotations

import random

import pytest

from core.generator import _split_to_teams, generate_team_rounds
from core.models import Participant


def test_split_to_teams_balanced() -> None:
    source = [Participant("001", "A"), Participant("002", "B"), Participant("003", "C")]
    teams = _split_to_teams(source, 2)

    assert len(teams) == 2
    assert len(teams[0]) == 2
    assert len(teams[1]) == 1


def test_generate_rounds_returns_exact_count() -> None:
    rounds = generate_team_rounds(
        4,
        [Participant("001", "A"), Participant("002", "B")],
        1,
        rng=random.Random(10),
    )

    assert len(rounds) == 4
    assert [item.number for item in rounds] == [1, 2, 3, 4]


def test_generate_rounds_is_reproducible_with_seed() -> None:
    participants = [
        Participant("001", "A"),
        Participant("002", "B"),
        Participant("003", "C"),
        Participant("004", "D"),
    ]

    first = generate_team_rounds(6, participants, 2, rng=random.Random(7))
    second = generate_team_rounds(6, participants, 2, rng=random.Random(7))

    assert first == second


def test_generate_rounds_rejects_invalid_round_count() -> None:
    with pytest.raises(ValueError, match="не меньше 1"):
        generate_team_rounds(0, [Participant("001", "A"), Participant("002", "B")], 2)


def test_generate_rounds_rejects_too_few_participants() -> None:
    with pytest.raises(ValueError, match="минимум 2"):
        generate_team_rounds(1, [Participant("001", "A")], 2)


def test_generate_rounds_captain_mode_sets_team_captains() -> None:
    participants = [Participant(f"{i:03d}", f"P{i}", is_captain=i <= 4) for i in range(1, 13)]
    rounds = generate_team_rounds(
        2,
        participants,
        3,
        captain_mode=True,
        rng=random.Random(2),
    )

    for round_item in rounds:
        assert len(round_item.teams) == 4
        assert all(team for team in round_item.teams)
        captains = [team[0] for team in round_item.teams]
        assert [captain.number for captain in captains] == ["001", "002", "003", "004"]
        assert all(captain.is_captain for captain in captains)
        assert len(set(captains)) == len(captains)


def test_generate_rounds_captain_mode_rejects_missing_captains() -> None:
    participants = [Participant(f"{i:03d}", f"P{i}", is_captain=i <= 2) for i in range(1, 13)]
    with pytest.raises(ValueError, match="капитана для каждой команды"):
        generate_team_rounds(1, participants, 3, captain_mode=True, rng=random.Random(1))
