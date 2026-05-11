from dataclasses import dataclass


@dataclass(frozen=True)
class Participant:
    """Competition participant with 3-digit number and full name."""

    number: str
    full_name: str
    is_captain: bool = False


@dataclass(frozen=True)
class TeamRound:
    """One round assignment split into N teams."""

    number: int
    teams: list[list[Participant]]
