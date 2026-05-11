"""UI stylesheet."""

from __future__ import annotations

import sys
from pathlib import Path

APP_STYLESHEET = """
QMainWindow { background-color: #000000; }
QLabel, QCheckBox { color: #e8f3f9; font-size: 14px; }
QLabel#roundsLabel {
    color: #f1f4f7;
    font-size: 23px;
    font-weight: 700;
}
QSpinBox#roundCountBox {
    background: #dfdfe2;
    color: #000000;
    border: 0px;
    border-radius: 0px;
    padding: 2px 6px;
    font-size: 22px;
    font-weight: 700;
    min-height: 20px;
    max-height: 20px;
    min-width: 36px;
}
QComboBox#roundCountBox {
    background: #dfdfe2;
    color: #000000;
    border: 0px;
    border-radius: 0px;
    padding: 1px 6px;
    font-size: 20px;
    font-weight: 700;
    min-height: 24px;
    max-height: 24px;
    min-width: 48px;
    max-width: 48px;
}
QPushButton#actionButton {
    background: #dfdfe2;
    color: #000000;
    border: 0px;
    border-radius: 5px;
    padding: 3px 14px;
    font-size: 23px;
    font-weight: 700;
    min-height: 31px;
}
QPushButton#actionButton:hover { background: #ececef; }
QToolButton#settingsToggle {
    background: transparent;
    color: #f1f4f7;
    border: none;
    font-size: 24px;
    min-width: 28px;
    min-height: 28px;
    padding: 0px;
}
QToolButton#settingsToggle:hover { color: #ffffff; }
QToolButton#exportPdfButton {
    background: #dfdfe2;
    color: #000000;
    border: 0px;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 700;
    min-width: 54px;
    min-height: 28px;
    padding: 2px 8px;
}
QToolButton#exportPdfButton:hover {
    background: #ececef;
}
QFrame#topSeparator {
    color: #c2c9ce;
    background: #c2c9ce;
    min-height: 1px;
    max-height: 1px;
}
QWidget#resultsPanel { background: #000000; }
QScrollArea { border: none; background: #000000; }
QScrollArea > QWidget > QWidget { background: #000000; }
QLabel#resultTitle {
    color: #ffffff;
    font-size: 74px;
    font-weight: 800;
    margin: 0px;
}
QLabel#roundLabel {
    color: #e4edf3;
    font-weight: 700;
    margin: 6px 0;
}
QLabel#dualColumnTitle {
    color: #ffffff;
    font-size: 44px;
    font-weight: 800;
    margin: 4px 0 8px 0;
}
QFrame#dualDivider {
    color: #c2c9ce;
    background: #c2c9ce;
    min-width: 1px;
    max-width: 1px;
}
QLabel#settingsColumnTitle {
    color: #f1f4f7;
    font-size: 40px;
    font-weight: 700;
    margin: 0;
}
QLabel#settingsRoundsLabel {
    color: #f1f4f7;
    font-size: 20px;
    font-weight: 700;
}
QGroupBox {
    color: #e8f3f9;
    border: 1px solid #c2c9ce;
    margin-top: 12px;
    padding-top: 10px;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 10px;
    padding: 0 6px;
    color: #f1f4f7;
    font-size: 14px;
    font-weight: 700;
}
QWidget#settingsPopup QLabel,
QWidget#settingsPopup QCheckBox {
    font-size: 12px;
}
QWidget#settingsPopup QLabel#settingsColumnTitle {
    font-size: 25px;
    font-weight: 700;
}
QWidget#settingsPopup QLabel#settingsRoundsLabel {
    font-size: 20px;
    font-weight: 700;
}
QWidget#settingsPopup QCheckBox {
    min-width: 20px;
    min-height: 20px;
}
QWidget#settingsPopup QCheckBox#popupHeaderCheckbox {
    min-width: 28px;
    min-height: 28px;
    padding: 0px;
    margin: 0px;
    spacing: 0px;
}
QWidget#settingsPopup QCheckBox#popupHeaderCheckbox::indicator {
    width: 22px;
    height: 22px;
}
QWidget#settingsPopup QGroupBox {
    border: 1px solid #c2c9ce;
    margin-top: 9px;
    padding-top: 6px;
}
QWidget#settingsPopup QGroupBox::title {
    left: 8px;
    padding: 0 5px;
    font-size: 12px;
    font-weight: 700;
}
QLabel#resultCard {
    background: #12a9e1;
    color: #ffffff;
    border-radius: 9px;
    font-weight: 700;
    padding: 8px 8px;
}
QLabel#dualResultCard {
    background: #12a9e1;
    color: #ffffff;
    border-radius: 9px;
    font-weight: 700;
    font-size: 18px;
    padding: 8px 8px;
}
"""


def get_app_stylesheet() -> str:
    """Return stylesheet for the application."""
    return APP_STYLESHEET
