"""UI stylesheet."""

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
    min-height: 31px;
    min-width: 36px;
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
QLabel#settingsColumnTitle {
    color: #f1f4f7;
    font-size: 22px;
    font-weight: 800;
    margin: 2px 0 4px 0;
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
    border-radius: 0px;
    font-weight: 700;
    padding: 8px 8px;
}
"""
