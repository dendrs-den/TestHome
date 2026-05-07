"""Data models for draw generation."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Element:
    """One dive pool element with code and readable title."""

    code: str
    name: str


@dataclass(frozen=True)
class Round:
    """A single generated round with three selected elements."""

    number: int
    snake: Element
    vertical: Element
    mixer: Element
