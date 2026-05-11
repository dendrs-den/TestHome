from __future__ import annotations

from pathlib import Path

from utils import session_settings


def test_save_and_load_settings_roundtrip(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "FlyerGenerators.cfg"
    target.write_text(
        "APP_TITLE_TEXT = 'Flyer Generators'\nDEFAULT_ROUND_COUNT = 5\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(session_settings, "get_settings_path", lambda: target)

    payload = {
        "round_count": 7,
        "participants": [
            {"number": "001", "full_name": "John Doe"},
            {"number": "002", "full_name": "Jane Doe"},
        ],
    }
    session_settings.save_settings(payload)

    cfg_text = target.read_text(encoding="utf-8")
    assert "APP_TITLE_TEXT" in cfg_text
    assert "session_settings_json" in cfg_text
    assert session_settings.load_settings() == payload


def test_load_settings_returns_empty_on_invalid_json(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "FlyerGenerators.cfg"
    target.write_text("session_settings_json = '''\n{broken\n'''\n", encoding="utf-8")
    monkeypatch.setattr(session_settings, "get_settings_path", lambda: target)
    monkeypatch.setattr(session_settings, "_legacy_local_settings_path", lambda: tmp_path / "missing_local.cfg")
    monkeypatch.setattr(session_settings, "_legacy_settings_path", lambda: tmp_path / "missing_legacy.json")

    assert session_settings.load_settings() == {}


def test_load_settings_returns_empty_when_missing(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "absent.cfg"
    monkeypatch.setattr(session_settings, "get_settings_path", lambda: target)

    assert session_settings.load_settings() == {}
