"""Application entrypoint."""

from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication

from ui.main_window import MainWindow


def _resource_path(relative_path: str) -> Path:
    """Resolve resource path for dev mode and onefile bundle mode."""
    base_dir = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base_dir / relative_path


def main() -> int:
    """Start Qt app and open maximized window close to 1920x1080 fullscreen behavior."""
    app = QApplication(sys.argv)
    icon_path = _resource_path("assets/draw_generators_icon.ico")
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))
    window = MainWindow()
    if icon_path.exists():
        window.setWindowIcon(QIcon(str(icon_path)))
    window.resize(1920, 1080)
    window.showMaximized()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
