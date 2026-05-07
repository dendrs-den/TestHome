"""Persistence for UI settings across application sessions."""

from __future__ import annotations

import json
import os
from pathlib import Path


def get_settings_path() -> Path:
    """Return platform-aware location for session settings file."""
    appdata = os.getenv("APPDATA")
    if appdata:
        return Path(appdata) / "DrawGeneratorsApp" / "settings.json"
    return Path.home() / ".draw_generators_app" / "settings.json"


def load_settings() -> dict:
    """Load settings from disk or return safe defaults when missing/corrupted."""
    path = get_settings_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_settings(settings: dict) -> None:
    """Persist settings dictionary to disk."""
    path = get_settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")
