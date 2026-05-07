"""Main window for Draw Generators app."""

from __future__ import annotations

import random

from PySide6.QtCore import QTimer, Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSpinBox,
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

        self.snakes_group = ElementGroupWidget("Snakes", tuples_to_elements(config.SNAKES))
        self.verticals_group = ElementGroupWidget("Verticals", tuples_to_elements(config.VERTICALS))
        self.mixers_group = ElementGroupWidget("Mixers", tuples_to_elements(config.MIXERS))

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
        self.result_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
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

        self._build_ui()
        self._bind_settings_change_events()
        self._load_session_settings()
        # Start with hidden settings panel as requested.
        self.settings_panel.setVisible(False)

    def _build_ui(self) -> None:
        """Compose all widgets into the main layout."""
        settings_layout = QVBoxLayout()
        settings_layout.addWidget(self.snakes_group)
        settings_layout.addWidget(self.verticals_group)
        settings_layout.addWidget(self.mixers_group)
        settings_layout.addStretch(1)

        self.settings_panel = QWidget()
        self.settings_panel.setLayout(settings_layout)

        self.title_label = QLabel(config.APP_TITLE_TEXT)
        self.title_label.setObjectName("resultTitle")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

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
        content.addLayout(results, 2)
        content.addWidget(self.settings_panel, 1)

        outer = QVBoxLayout()
        outer.addLayout(top_bar)
        top_line = QFrame()
        top_line.setObjectName("topSeparator")
        top_line.setFrameShape(QFrame.Shape.HLine)
        outer.addWidget(top_line)
        outer.addLayout(content)

        root.setLayout(outer)
        self.setCentralWidget(root)

    def on_generate_clicked(self) -> None:
        """Generate rounds and render or show validation error."""
        try:
            rounds = generate_rounds(
                round_count=self.round_count.value(),
                snakes=self.snakes_group.selected_elements(),
                verticals=self.verticals_group.selected_elements(),
                mixers=self.mixers_group.selected_elements(),
                rng=random.Random(),
            )
        except ValueError as exc:
            QMessageBox.warning(self, "Validation error", str(exc))
            return

        self._last_rounds = rounds
        if len(rounds) > 5:
            self.result_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        else:
            self.result_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self._start_shuffle_pulse(rounds)
        self._save_current_settings()

    def on_toggle_settings_clicked(self) -> None:
        """Toggle visibility of settings panel via the gear button."""
        self.settings_panel.setVisible(not self.settings_panel.isVisible())

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

    def _bind_settings_change_events(self) -> None:
        """Bind checkbox change handlers to persist session settings."""
        for group in (self.snakes_group, self.verticals_group, self.mixers_group):
            for checkbox in group._map:  # noqa: SLF001
                checkbox.stateChanged.connect(self._save_current_settings)

    def _save_current_settings(self) -> None:
        """Save round count and element selections to session storage."""
        save_settings(
            {
                "round_count": self.round_count.value(),
                "snakes": self.snakes_group.selected_codes(),
                "verticals": self.verticals_group.selected_codes(),
                "mixers": self.mixers_group.selected_codes(),
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

        snakes = settings.get("snakes")
        if isinstance(snakes, list):
            self.snakes_group.apply_selected_codes([str(value) for value in snakes])
        verticals = settings.get("verticals")
        if isinstance(verticals, list):
            self.verticals_group.apply_selected_codes([str(value) for value in verticals])
        mixers = settings.get("mixers")
        if isinstance(mixers, list):
            self.mixers_group.apply_selected_codes([str(value) for value in mixers])

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
            self.title_label.setText(config.APP_TITLE_TEXT)
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
        snakes = self.snakes_group.selected_elements()
        verticals = self.verticals_group.selected_elements()
        mixers = self.mixers_group.selected_elements()
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
