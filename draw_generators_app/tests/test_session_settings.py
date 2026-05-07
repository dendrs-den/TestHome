from __future__ import annotations

import json
from pathlib import Path

from utils import session_settings


def test_save_and_load_settings_roundtrip(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "settings.json"
    monkeypatch.setattr(session_settings, "get_settings_path", lambda: target)

    payload = {
        "round_count": 7,
        "snakes": ["S1", "S2"],
        "verticals": ["V1"],
        "mixers": ["M5"],
    }
    session_settings.save_settings(payload)

    assert json.loads(target.read_text(encoding="utf-8")) == payload
    assert session_settings.load_settings() == payload


def test_load_settings_returns_empty_on_invalid_json(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "settings.json"
    target.write_text("{broken", encoding="utf-8")
    monkeypatch.setattr(session_settings, "get_settings_path", lambda: target)

    assert session_settings.load_settings() == {}


def test_load_settings_returns_empty_when_missing(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "absent.json"
    monkeypatch.setattr(session_settings, "get_settings_path", lambda: target)

    assert session_settings.load_settings() == {}
