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
        return _normalize_settings_text(from_cfg)

    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(loaded, dict):
            return _normalize_settings_text(loaded)
        return {}
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


_MOJIBAKE_MARKERS_RE = re.compile(r"[РС][\u0400-\u04FF]")


def _repair_mojibake_text(value: str) -> str:
    """Best-effort fix for UTF-8 text decoded as CP1251."""
    if not value or not _MOJIBAKE_MARKERS_RE.search(value):
        return value

    def _score(text: str) -> int:
        cyr = sum(1 for ch in text if "\u0400" <= ch <= "\u04FF")
        garbled = text.count("Р") + text.count("С") + text.count("Ð") + text.count("Ñ")
        return cyr - garbled

    best = value
    best_score = _score(value)
    for enc in ("cp1251", "latin1"):
        for encode_err, decode_err in (
            ("strict", "strict"),
            ("ignore", "strict"),
            ("replace", "strict"),
            ("ignore", "ignore"),
            ("replace", "ignore"),
        ):
            try:
                candidate = value.encode(enc, errors=encode_err).decode("utf-8", errors=decode_err)
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
            score = _score(candidate)
            if score > best_score:
                best = candidate
                best_score = score
    return best


def _normalize_settings_text(value):
    """Recursively normalize possible mojibake strings in settings payload."""
    if isinstance(value, str):
        return _repair_mojibake_text(value)
    if isinstance(value, list):
        return [_normalize_settings_text(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_settings_text(item) for key, item in value.items()}
    return value


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
