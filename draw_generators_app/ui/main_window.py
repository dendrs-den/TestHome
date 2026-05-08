"""Main window for Draw Generators app."""

from __future__ import annotations

import random

from PySide6.QtCore import QTimer, Qt
from PySide6.QtWidgets import (
    QComboBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSpinBox,
    QSizePolicy,
    QToolButton,
    QVBoxLayout,
    QWidget,
)

import config
from core.generator import generate_rounds
from core.models import Round
from ui.styles import APP_STYLESHEET
from ui.widgets import ElementGroupWidget
from utils.helpers import tuples_to_elements
from utils.session_settings import load_settings, save_settings


class MainWindow(QMainWindow):
    """Main app window with settings and generated result."""

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Draw Generators")
        self.setStyleSheet(APP_STYLESHEET)

        self.round_count = QSpinBox()
        self.round_count.setRange(1, 100)
        self.round_count.setValue(5)
        self.round_count.setObjectName("roundCountBox")

        self.competition_labels = config.get_competition_labels()
        self.competition_select = QComboBox()
        for key, label in self.competition_labels.items():
            self.competition_select.addItem(label, key)

        self.groups_by_competition: dict[str, dict[str, ElementGroupWidget]] = {}
        self._build_competition_groups()

        self.generate_button = QPushButton("Generate")
        self.generate_button.setObjectName("actionButton")

        self.settings_toggle = QToolButton()
        self.settings_toggle.setObjectName("settingsToggle")
        self.settings_toggle.setText("⚙")
        self.settings_toggle.setToolTip("Show or hide settings panel")

        self.result_container = QWidget()
        self.result_container.setObjectName("resultsPanel")
        self.result_layout = QVBoxLayout()
        self.result_layout.setSpacing(12)
        self.result_layout.setContentsMargins(0, 0, 0, 0)
        self.result_layout.addStretch(1)
        self.result_container.setLayout(self.result_layout)

        self.result_scroll = QScrollArea()
        self.result_scroll.setWidgetResizable(True)
        self.result_scroll.setWidget(self.result_container)
        self.result_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.result_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self._last_rounds: list[Round] = []
        self._pulse_timer = QTimer(self)
        self._pulse_timer.timeout.connect(self._on_pulse_tick)
        self._target_rounds: list[Round] = []
        self._pulse_ticks = 0
        self._pulse_total_ticks = config.ANIMATION_STEP_COUNT
        self._blink_timer = QTimer(self)
        self._blink_timer.timeout.connect(self._toggle_generating_blink)
        self._blink_visible = True
        self._default_title_style = "color: #ffffff;"

        self.generate_button.clicked.connect(self.on_generate_clicked)
        self.settings_toggle.clicked.connect(self.on_toggle_settings_clicked)
        self.round_count.valueChanged.connect(self._save_current_settings)
        self.competition_select.currentIndexChanged.connect(self._on_competition_changed)

        self._build_ui()
        self._bind_settings_change_events()
        self._load_session_settings()
        self.settings_popup.hide()

    def _build_ui(self) -> None:
        """Compose all widgets into the main layout."""
        self.title_label = QLabel(config.APP_TITLE_TEXT)
        self.title_label.setObjectName("resultTitle")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._on_competition_changed()

        top_bar = QHBoxLayout()
        top_bar.setContentsMargins(0, 8, 0, 10)
        top_bar.setSpacing(0)

        self.left_controls = QWidget()
        left_layout = QHBoxLayout()
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(14)
        left_layout.addWidget(self.generate_button)
        self.left_controls.setLayout(left_layout)

        self.right_controls = QWidget()
        right_layout = QHBoxLayout()
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(14)
        rounds_label = QLabel("Rounds:")
        rounds_label.setObjectName("roundsLabel")
        competition_label = QLabel("Competition:")
        competition_label.setObjectName("roundsLabel")
        right_layout.addWidget(competition_label)
        right_layout.addWidget(self.competition_select)
        right_layout.addWidget(rounds_label)
        right_layout.addWidget(self.round_count)
        right_layout.addWidget(self.settings_toggle)
        self.right_controls.setLayout(right_layout)

        top_bar.addWidget(self.left_controls)
        top_bar.addStretch(1)
        top_bar.addWidget(self.title_label)
        top_bar.addStretch(1)
        top_bar.addWidget(self.right_controls)

        root = QWidget()
        content = QHBoxLayout()

        results = QVBoxLayout()
        results.addWidget(self.result_scroll)
        results.setContentsMargins(36, 22, 36, 0)
        content.addLayout(results, 1)

        outer = QVBoxLayout()
        outer.addLayout(top_bar)
        top_line = QFrame()
        self.top_separator = top_line
        top_line.setObjectName("topSeparator")
        top_line.setFrameShape(QFrame.Shape.HLine)
        outer.addWidget(top_line)
        outer.addLayout(content)

        root.setLayout(outer)
        self.setCentralWidget(root)
        self._build_settings_popup()

    def on_generate_clicked(self) -> None:
        """Generate rounds and render or show validation error."""
        try:
            rounds = generate_rounds(
                round_count=self.round_count.value(),
                snakes=self._active_groups()["snakes"].selected_elements(),
                verticals=self._active_groups()["verticals"].selected_elements(),
                mixers=self._active_groups()["mixers"].selected_elements(),
                rng=random.Random(),
            )
        except ValueError as exc:
            QMessageBox.warning(self, "Validation error", str(exc))
            return

        self._last_rounds = rounds
        self._start_shuffle_pulse(rounds)
        self._save_current_settings()

    def on_toggle_settings_clicked(self) -> None:
        """Toggle popup visibility for element settings."""
        if self.settings_popup.isVisible():
            self.settings_popup.hide()
            return

        self._place_settings_popup()
        self.settings_popup.show()
        self.settings_popup.raise_()

    def _clear_results(self) -> None:
        """Remove all result widgets while preserving bottom stretch."""
        while self.result_layout.count() > 1:
            item = self.result_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

    def _render_rounds(self, rounds: list[Round]) -> None:
        """Render rounds as large cards similar to the reference screenshot."""
        self._clear_results()
        for round_item in rounds:
            self._append_round_widget(round_item)

    def _calculate_result_sizes(self) -> tuple[int, int, int]:
        """Return fixed sizes; scrolling handles larger round counts."""
        return (34, 28, 74)

    def resizeEvent(self, event) -> None:  # noqa: N802
        """Re-render generated rounds so sizes adapt to new window dimensions."""
        super().resizeEvent(event)
        if self._last_rounds:
            self._render_rounds(self._last_rounds)
        if self.settings_popup.isVisible():
            self._place_settings_popup()

    def _bind_settings_change_events(self) -> None:
        """Bind checkbox change handlers to persist session settings."""
        for group_set in self.groups_by_competition.values():
            for group in group_set.values():
                for checkbox in group._map:  # noqa: SLF001
                    checkbox.stateChanged.connect(self._save_current_settings)

    def _save_current_settings(self) -> None:
        """Save round count and element selections to session storage."""
        competition_key = self._current_competition_key()
        saved = load_settings()
        selections: dict[str, dict[str, list[str]]] = {}
        if isinstance(saved, dict):
            raw_selections = saved.get("selections")
            if isinstance(raw_selections, dict):
                for key, value in raw_selections.items():
                    if isinstance(key, str) and isinstance(value, dict):
                        selections[key] = {
                            "snakes": [str(item) for item in value.get("snakes", [])] if isinstance(value.get("snakes"), list) else [],
                            "verticals": [str(item) for item in value.get("verticals", [])] if isinstance(value.get("verticals"), list) else [],
                            "mixers": [str(item) for item in value.get("mixers", [])] if isinstance(value.get("mixers"), list) else [],
                        }

        selections[competition_key] = {
            "snakes": self._active_groups()["snakes"].selected_codes(),
            "verticals": self._active_groups()["verticals"].selected_codes(),
            "mixers": self._active_groups()["mixers"].selected_codes(),
        }

        save_settings(
            {
                "round_count": self.round_count.value(),
                "competition": competition_key,
                "selections": selections,
            }
        )

    def _load_session_settings(self) -> None:
        """Restore previously saved settings when available."""
        settings = load_settings()
        if not settings:
            return

        round_count = settings.get("round_count")
        if isinstance(round_count, int):
            self.round_count.setValue(max(1, min(100, round_count)))

        selections = settings.get("selections")
        if isinstance(selections, dict):
            for competition_key, selection_data in selections.items():
                if competition_key in self.groups_by_competition and isinstance(selection_data, dict):
                    self._apply_selection_to_groups(self.groups_by_competition[competition_key], selection_data)

        competition = settings.get("competition")
        if isinstance(competition, str):
            idx = self.competition_select.findData(competition)
            if idx >= 0:
                self.competition_select.setCurrentIndex(idx)
        self._on_competition_changed()

    def _start_shuffle_pulse(self, rounds: list[Round]) -> None:
        """Start short shuffle pulse animation before final result render."""
        self._clear_results()
        self._target_rounds = list(rounds)
        self._pulse_ticks = 0
        self.generate_button.setEnabled(False)
        self.left_controls.setVisible(False)
        self.right_controls.setVisible(False)
        self.title_label.setText("Generating...")
        self.title_label.setStyleSheet("color: #ffffff;")
        self._blink_visible = True
        self._blink_timer.start(300)
        self._pulse_timer.start(config.ANIMATION_STEP_DELAY_MS)

    def _on_pulse_tick(self) -> None:
        """Render intermediate shuffled placeholders, then final rounds."""
        if self._pulse_ticks >= self._pulse_total_ticks:
            self._pulse_timer.stop()
            self._blink_timer.stop()
            self.title_label.setText(config.get_competition_title(self._current_competition_key()))
            self.title_label.setStyleSheet(self._default_title_style)
            self.left_controls.setVisible(True)
            self.right_controls.setVisible(True)
            self.generate_button.setEnabled(True)
            self._render_rounds(self._target_rounds)
            return

        self._pulse_ticks += 1
        self._render_pulse_frame(len(self._target_rounds))

    def _render_pulse_frame(self, rounds_count: int) -> None:
        """Render one pulse frame with temporary shuffled cards."""
        self._clear_results()
        active_groups = self._active_groups()
        snakes = active_groups["snakes"].selected_elements()
        verticals = active_groups["verticals"].selected_elements()
        mixers = active_groups["mixers"].selected_elements()
        if not snakes or not verticals or not mixers:
            return

        for idx in range(rounds_count):
            fake_round = Round(
                number=idx + 1,
                snake=random.choice(snakes),
                vertical=random.choice(verticals),
                mixer=random.choice(mixers),
            )
            self._append_round_widget(fake_round)

    def _append_round_widget(self, round_item: Round) -> None:
        """Append one round block into results container."""
        round_font_size, card_font_size, card_height = self._calculate_result_sizes()
        round_label = QLabel(f"Round {round_item.number}")
        round_label.setObjectName("roundLabel")
        round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        round_label.setStyleSheet(f"font-size: {round_font_size}px;")
        self.result_layout.insertWidget(self.result_layout.count() - 1, round_label)

        row = QWidget()
        row_layout = QGridLayout()
        row_layout.setHorizontalSpacing(22)
        row_layout.setVerticalSpacing(0)
        row_layout.setContentsMargins(0, 0, 0, 0)

        cards = [
            f"{round_item.snake.code} {round_item.snake.name}",
            f"{round_item.vertical.code} {round_item.vertical.name}",
            f"{round_item.mixer.code} {round_item.mixer.name}",
        ]
        for idx, text in enumerate(cards):
            card = QLabel(text)
            card.setObjectName("resultCard")
            card.setMinimumHeight(card_height)
            card.setAlignment(Qt.AlignmentFlag.AlignCenter)
            card.setWordWrap(True)
            card.setStyleSheet(f"font-size: {card_font_size}px;")
            row_layout.addWidget(card, 0, idx)

        row.setLayout(row_layout)
        self.result_layout.insertWidget(self.result_layout.count() - 1, row)

    def _toggle_generating_blink(self) -> None:
        """Blink generating label while shuffle animation is active."""
        self._blink_visible = not self._blink_visible
        if self._blink_visible:
            self.title_label.setStyleSheet("color: #ffffff;")
        else:
            self.title_label.setStyleSheet("color: #000000;")

    def _current_competition_key(self) -> str:
        """Return currently selected competition key."""
        key = self.competition_select.currentData()
        return str(key) if key is not None else config.DEFAULT_COMPETITION

    def _on_competition_changed(self) -> None:
        """Handle competition selection changes."""
        self.title_label.setText(config.get_competition_title(self._current_competition_key()))
        self._save_current_settings()

    def _build_competition_groups(self) -> None:
        """Create fixed element group widgets for each competition."""
        for competition_key in self.competition_labels:
            snakes, verticals, mixers = config.get_competition_pools(competition_key)
            self.groups_by_competition[competition_key] = {
                "snakes": ElementGroupWidget("Snakes", tuples_to_elements(snakes)),
                "verticals": ElementGroupWidget("Verticals", tuples_to_elements(verticals)),
                "mixers": ElementGroupWidget("Mixers", tuples_to_elements(mixers)),
            }

    def _build_settings_popup(self) -> None:
        """Create floating settings popup with both competition sets."""
        self.settings_popup = QWidget(self.centralWidget())
        self.settings_popup.setObjectName("settingsPopup")
        self.settings_popup.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.settings_popup.setStyleSheet(
            "QWidget#settingsPopup {"
            "background: #121212;"
            "border: 1px solid #2f2f2f;"
            "border-radius: 12px;"
            "}"
        )

        content_widget = QWidget()
        content_widget.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Maximum)
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(8)

        grid = QGridLayout()
        grid.setHorizontalSpacing(10)
        grid.setVerticalSpacing(8)
        grid.setContentsMargins(0, 0, 0, 0)

        left_key = "D2W_D4W" if "D2W_D4W" in self.competition_labels else next(iter(self.competition_labels))
        right_key = "DS" if "DS" in self.competition_labels else left_key

        left_header = QLabel(self.competition_labels[left_key])
        left_header.setObjectName("settingsColumnTitle")
        right_header = QLabel(self.competition_labels[right_key])
        right_header.setObjectName("settingsColumnTitle")
        grid.addWidget(left_header, 0, 0)
        grid.addWidget(right_header, 0, 1)

        categories = [("snakes", 1), ("verticals", 2), ("mixers", 3)]
        for name, row in categories:
            grid.addWidget(self.groups_by_competition[left_key][name], row, 0)
            grid.addWidget(self.groups_by_competition[right_key][name], row, 1)

        # Keep rows compact at the top; consume extra height in the trailing spacer row.
        grid.setRowStretch(4, 1)
        grid.setColumnStretch(0, 1)
        grid.setColumnStretch(1, 1)
        layout.addLayout(grid)
        content_widget.setLayout(layout)

        self.settings_popup_scroll = QScrollArea()
        self.settings_popup_scroll.setWidgetResizable(True)
        self.settings_popup_scroll.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        self.settings_popup_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.settings_popup_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.settings_popup_scroll.setWidget(content_widget)

        popup_layout = QVBoxLayout()
        popup_layout.setContentsMargins(0, 0, 0, 0)
        popup_layout.addWidget(self.settings_popup_scroll)
        self.settings_popup.setLayout(popup_layout)
        initial_size = self._settings_popup_size()
        self.settings_popup.resize(initial_size[0], initial_size[1])

    def _active_groups(self) -> dict[str, ElementGroupWidget]:
        """Return element groups for currently selected competition."""
        key = self._current_competition_key()
        return self.groups_by_competition.get(key, next(iter(self.groups_by_competition.values())))

    def _apply_selection_to_groups(self, group_set: dict[str, ElementGroupWidget], data: dict) -> None:
        """Apply saved selected codes to target competition group set."""
        snakes_codes = data.get("snakes")
        if isinstance(snakes_codes, list):
            group_set["snakes"].apply_selected_codes([str(value) for value in snakes_codes])
        verticals_codes = data.get("verticals")
        if isinstance(verticals_codes, list):
            group_set["verticals"].apply_selected_codes([str(value) for value in verticals_codes])
        mixers_codes = data.get("mixers")
        if isinstance(mixers_codes, list):
            group_set["mixers"].apply_selected_codes([str(value) for value in mixers_codes])

    def _settings_popup_size(self) -> tuple[int, int]:
        """Return popup size constrained by current main window size."""
        margin = 12
        available_width = max(220, self.width() - (margin * 2))
        min_y = self._settings_popup_min_y()
        available_height = max(220, self.height() - min_y - margin)
        preferred_width = 1040
        preferred_height = 860
        width = min(preferred_width, available_width)
        height = min(preferred_height, available_height)
        return (width, height)

    def _settings_popup_min_y(self) -> int:
        """Return minimal Y coordinate below header separator line."""
        if hasattr(self, "top_separator"):
            line_bottom = self.top_separator.geometry().bottom()
            return line_bottom + 2
        return 12

    def _place_settings_popup(self) -> None:
        """Place popup fully inside the main window bounds."""
        margin = 12
        popup_width, popup_height = self._settings_popup_size()
        local_pos = self.settings_toggle.mapTo(self, self.settings_toggle.rect().bottomLeft())
        desired_x = local_pos.x() - popup_width + self.settings_toggle.width()
        min_y = self._settings_popup_min_y()
        desired_y = local_pos.y() + 8

        max_x = max(margin, self.width() - popup_width - margin)
        max_y = max(min_y, self.height() - popup_height - margin)
        x = min(max(desired_x, margin), max_x)
        y = min(max(desired_y, min_y), max_y)
        self.settings_popup.setGeometry(x, y, popup_width, popup_height)
