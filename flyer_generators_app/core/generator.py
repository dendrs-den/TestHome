"""Team generation algorithm implementation."""

from __future__ import annotations

import random
from math import ceil
from typing import Sequence

from core.models import Participant, TeamRound
from core.validators import validate_participants, validate_round_count, validate_team_size


def _split_to_teams(participants: Sequence[Participant], team_size: int) -> list[list[Participant]]:
    """Split shuffled participants into teams with requested max team size."""
    teams: list[list[Participant]] = []
    current: list[Participant] = []
    for participant in participants:
        current.append(participant)
        if len(current) >= team_size:
            teams.append(current)
            current = []
    if current:
        teams.append(current)
    return teams


def _split_to_teams_with_captains(participants: Sequence[Participant], team_size: int) -> list[list[Participant]]:
    """Split participants with fixed captains in teams by ascending captain number."""
    team_count = max(1, ceil(len(participants) / team_size))
    captains = sorted((item for item in participants if item.is_captain), key=lambda x: x.number)
    if len(captains) > team_count:
        raise ValueError("Количество капитанов не должно быть больше количества команд.")
    if len(captains) != team_count:
        raise ValueError("В режиме Captain нужно выбрать капитана для каждой команды.")
    remaining = [item for item in participants if not item.is_captain]
    teams: list[list[Participant]] = [[captain] for captain in captains]
    team_idx = 0
    for participant in remaining:
        while len(teams[team_idx]) >= team_size:
            team_idx = (team_idx + 1) % team_count
        teams[team_idx].append(participant)
        team_idx = (team_idx + 1) % team_count
    return teams


def generate_team_rounds(
    round_count: int,
    participants: Sequence[Participant],
    team_size: int,
    captain_mode: bool = False,
    rng: random.Random | None = None,
) -> list[TeamRound]:
    """Generate random team assignment for each round."""
    validate_round_count(round_count)
    validate_team_size(team_size)
    participants_list = list(participants)
    validate_participants(participants_list)

    randomizer = rng or random.Random()
    rounds: list[TeamRound] = []
    for index in range(round_count):
        shuffled = list(participants_list)
        randomizer.shuffle(shuffled)
        teams = _split_to_teams_with_captains(shuffled, team_size) if captain_mode else _split_to_teams(shuffled, team_size)
        rounds.append(TeamRound(number=index + 1, teams=teams))
    return rounds
