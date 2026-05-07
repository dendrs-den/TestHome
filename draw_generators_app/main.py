"""Application entrypoint."""

from __future__ import annotations

import sys

from PySide6.QtWidgets import QApplication

from ui.main_window import MainWindow


def main() -> int:
    """Start Qt app and open maximized window close to 1920x1080 fullscreen behavior."""
    app = QApplication(sys.argv)
    window = MainWindow()
    window.resize(1920, 1080)
    window.showMaximized()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
