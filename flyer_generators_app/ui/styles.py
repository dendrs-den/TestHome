"""UI stylesheet."""

from __future__ import annotations

APP_STYLESHEET = """
QMainWindow { background-color: #030e21; }
QLabel { color: #e8f3f9; font-size: 14px; }
QWidget#settingsPopup {
    background: #000000;
    border: 1px solid #1f252b;
}
QToolButton#actionButton,
QPushButton#actionButton {
    background: #dfdfe2;
    color: #000000;
    border: 0px;
    border-radius: 5px;
    padding: 3px 14px;
    font-size: 16px;
    font-weight: 700;
    min-height: 30px;
}
QToolButton#actionButton:hover,
QPushButton#actionButton:hover { background: #ececef; }
QToolButton#settingsToggle {
    background: transparent;
    color: #f1f4f7;
    border: none;
    font-size: 24px;
    min-width: 28px;
    min-height: 28px;
}
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
QToolButton#exportExcelButton {
    background: #dfdfe2;
    color: #000000;
    border: 0px;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 700;
    min-width: 62px;
    min-height: 28px;
    padding: 2px 8px;
}
QFrame#topSeparator {
    color: #1f3d63;
    background: #1f3d63;
    min-height: 1px;
    max-height: 1px;
}
QMessageBox {
    background: #f2f2f2;
}
QMessageBox QLabel {
    color: #101010;
    font-size: 16px;
}
QMessageBox QPushButton {
    min-width: 88px;
    min-height: 30px;
    color: #101010;
}
QWidget#resultsPanel { background: #030e21; }
QScrollArea { border: none; background: #030e21; }
QLabel#resultTitle {
    color: #ffffff;
    font-size: 74px;
    font-weight: 800;
}
QLabel#roundLabel {
    color: #e4edf3;
    font-size: 30px;
    font-weight: 700;
    margin: 6px 0;
}
QLabel#settingsColumnTitle {
    color: #f1f4f7;
    font-size: 32px;
    font-weight: 700;
}
QLabel#settingsRoundsLabel {
    color: #f1f4f7;
    font-size: 20px;
    font-weight: 700;
}
QComboBox#roundCountBox {
    background: #dfdfe2;
    color: #000000;
    border: 0px;
    padding: 1px 6px;
    font-size: 20px;
    font-weight: 700;
    min-height: 24px;
    min-width: 60px;
}
QCheckBox#captainModeCheckbox {
    color: #f1f4f7;
    font-size: 18px;
    font-weight: 700;
    spacing: 8px;
}
QCheckBox#captainModeCheckbox::indicator {
    width: 16px;
    height: 16px;
}
QCheckBox#captainModeCheckbox::indicator:unchecked {
    border: 1px solid #8ba3bb;
    background: #0e1b2f;
}
QCheckBox#captainModeCheckbox::indicator:checked {
    border: 1px solid #27a8de;
    background: #27a8de;
}
QCheckBox#participantCaptainCheckbox {
    color: #f1f4f7;
    font-size: 16px;
    font-weight: 700;
    spacing: 6px;
    padding: 0px;
    margin: 0px;
}
QCheckBox#participantCaptainCheckbox::indicator {
    width: 14px;
    height: 14px;
    margin: 0px;
}
QCheckBox#participantCaptainCheckbox::indicator:unchecked {
    border: 1px solid #8ba3bb;
    background: #0e1b2f;
}
QCheckBox#participantCaptainCheckbox[captainModeActive="false"]::indicator:checked {
    border: 1px solid #8ba3bb;
    background: #0e1b2f;
}
QCheckBox#participantCaptainCheckbox[captainModeActive="true"]::indicator:checked {
    border: 1px solid #c13a3a;
    background: #c13a3a;
}
QWidget#settingsPopup QTableWidget#participantsTable {
    background: #101010;
    color: #f1f4f7;
    gridline-color: #3a3a3a;
    border: 1px solid #3a3a3a;
}
QWidget#settingsPopup QHeaderView::section {
    background: #202020;
    color: #f1f4f7;
    border: 1px solid #3a3a3a;
    padding: 4px;
}
QLabel#resultCard {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #28ace0, stop:1 #1788bc);
    color: #ffffff;
    border-radius: 9px;
    font-weight: 700;
    font-size: 18px;
    padding: 6px 12px;
}
QLabel#resultCard[captain="true"] {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #e24b4b, stop:1 #bf2f2f);
}
QLabel#teamColumnHeader {
    background: transparent;
    color: #87a8c9;
    font-size: 20px;
    font-weight: 700;
    padding: 4px 8px 8px 8px;
}
QLabel#participantsHeader {
    color: #d8e6ef;
    font-size: 20px;
    font-weight: 700;
}
QScrollArea#participantsScroll {
    border: none;
    background: #000000;
}
QScrollArea#participantsScroll > QWidget > QWidget {
    background: #000000;
}
QWidget#participantsListContainer {
    background: #000000;
}
QWidget#participantRow {
    background: transparent;
}
QWidget#participantRow[selected="true"] {
    background: #101820;
}
QWidget#participantRow[captainModeActive="true"][captain="true"] {
    background: #4a0f14;
    border: 1px solid #8d2a33;
    border-radius: 8px;
}
QWidget#participantRow[captainModeActive="true"][captain="true"][selected="true"] {
    background: #5f141b;
    border: 1px solid #b23a45;
    border-radius: 8px;
}
QLabel#participantOrder {
    color: #e4edf3;
    font-size: 26px;
    font-weight: 500;
}
QLineEdit#participantField,
QLineEdit#participantNumberField {
    background: #c8cdd2;
    color: #4a5560;
    border: 1px solid #aeb5bc;
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 28px;
}
QWidget#participantRow[captainModeActive="true"][captain="true"] QLineEdit#participantField,
QWidget#participantRow[captainModeActive="true"][captain="true"] QLineEdit#participantNumberField {
    background: #c63a46;
    color: #ffffff;
    border: 1px solid #a62f3a;
}
QWidget#participantRow[captainModeActive="true"][captain="true"][selected="true"] QLineEdit#participantField,
QWidget#participantRow[captainModeActive="true"][captain="true"][selected="true"] QLineEdit#participantNumberField {
    background: #d54552;
    color: #ffffff;
    border: 1px solid #b73843;
}
QLineEdit#participantField {
    min-height: 42px;
}
QLineEdit#participantNumberField {
    min-height: 42px;
}
QWidget#participantRow[editing="true"] QLineEdit#participantField,
QWidget#participantRow[editing="true"] QLineEdit#participantNumberField,
QLineEdit#participantField:focus,
QLineEdit#participantNumberField:focus,
QLineEdit#participantField[editingField="true"],
QLineEdit#participantNumberField[editingField="true"] {
    background: #ffffff;
    color: #101010;
    border: 1px solid #babec2;
}
QPushButton#rowActionButton {
    background: #dfdfe2;
    color: #000000;
    border: 1px solid #a7adb3;
    border-radius: 5px;
    padding: 2px 12px;
    font-size: 18px;
    font-weight: 700;
    min-width: 0px;
    min-height: 38px;
}
QPushButton#rowActionButton:hover {
    background: #ececef;
    border-color: #c1c6cc;
}
"""


def get_app_stylesheet() -> str:
    return APP_STYLESHEET

