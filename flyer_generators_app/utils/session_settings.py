"""Persistence for UI settings across application sessions."""

from __future__ import annotations

import json
import re
import runpy
from pathlib import Path

_SESSION_BLOCK_RE = re.compile(
    r"\n# --- Session settings \(auto-generated\) ---\n"
    r"session_settings_json = '''\n"
    r"(?P<payload>.*?)\n"
    r"'''\n?",
    re.DOTALL,
)


def get_settings_path() -> Path:
    """Return unified local project config path for app + session data."""
    return Path.cwd() / "FlyerGenerators.cfg"


def _legacy_local_settings_path() -> Path:
    """Return legacy local path used by previous app versions."""
    return Path.cwd() / "FlyerGenerators.session.cfg"


def load_settings() -> dict:
    """Load settings from disk or return safe defaults when missing/corrupted."""
    path = get_settings_path()
    _migrate_legacy_settings(path)
    if not path.exists():
        return {}

    from_cfg = _load_settings_from_cfg(path)
    if from_cfg:
        return from_cfg

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_settings(settings: dict) -> None:
    """Persist settings dictionary inside unified external cfg file."""
    path = get_settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(settings, ensure_ascii=False, indent=2)

    if path.exists():
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            text = ""
    else:
        text = ""

    block = (
        "\n# --- Session settings (auto-generated) ---\n"
        "session_settings_json = '''\n"
        f"{payload}\n"
        "'''\n"
    )

    if _SESSION_BLOCK_RE.search(text):
        updated = _SESSION_BLOCK_RE.sub(block, text)
    else:
        if text and not text.endswith("\n"):
            text += "\n"
        updated = text + block
    path.write_text(updated, encoding="utf-8")


def _load_settings_from_cfg(path: Path) -> dict:
    """Read embedded session JSON from cfg python module."""
    try:
        values = runpy.run_path(str(path))
    except Exception:
        return {}
    payload = values.get("session_settings_json")
    if not isinstance(payload, str):
        return {}
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _migrate_legacy_settings(path: Path) -> None:
    """Move only local legacy session JSON into unified cfg storage on first load."""
    if not path.exists():
        return
    if _load_settings_from_cfg(path):
        return

    legacy = _legacy_local_settings_path()
    if not legacy.exists():
        return
    try:
        data = json.loads(legacy.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    if isinstance(data, dict):
        save_settings(data)
