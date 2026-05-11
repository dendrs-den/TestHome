"""Main window for Draw Generators app."""

from __future__ import annotations

import random
from datetime import datetime
from html import escape

from PySide6.QtCore import QSignalBlocker, QTimer, Qt
from PySide6.QtCore import QMarginsF
from PySide6.QtGui import QPageLayout, QTextDocument
from PySide6.QtPrintSupport import QPrinter
from PySide6.QtWidgets import (
    QComboBox,
    QCheckBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QScrollArea,
    QSizePolicy,
    QToolButton,
    QVBoxLayout,
    QWidget,
)

import config
from core.generator import generate_rounds
from core.models import Element, Round
from ui.styles import get_app_stylesheet
from ui.widgets import ElementGroupWidget
from utils.helpers import tuples_to_elements
from utils.session_settings import load_settings, save_settings


class MainWindow(QMainWindow):
    """Main app window with settings and generated result."""

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Draw Generators")
        self.setStyleSheet(get_app_stylesheet())

        self.competition_labels = config.get_competition_labels()

        self.groups_by_competition: dict[str, dict[str, ElementGroupWidget]] = {}
        self._build_competition_groups()

        self.settings_toggle = QToolButton()
        self.settings_toggle.setObjectName("settingsToggle")
        self.settings_toggle.setText("⚙")
        self.settings_toggle.setToolTip("Show or hide settings panel")
        self.export_pdf_button = QToolButton()
        self.export_pdf_button.setObjectName("exportPdfButton")
        self.export_pdf_button.setText("PDF")
        self.export_pdf_button.setToolTip("Export current generation result to PDF")

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
        self._target_rounds_secondary: list[Round] = []
        self._pulse_ticks = 0
        self._pulse_total_ticks = config.ANIMATION_STEP_COUNT
        self._blink_timer = QTimer(self)
        self._blink_timer.timeout.connect(self._toggle_generating_blink)
        self._blink_visible = True
        self._default_title_style = "color: #ffffff;"
        self._last_secondary_rounds: list[Round] = []
        self._persisted_last_rounds: list[Round] = []
        self._persisted_last_secondary_rounds: list[Round] = []

        self.settings_toggle.clicked.connect(self.on_toggle_settings_clicked)
        self.export_pdf_button.clicked.connect(self.on_export_pdf_clicked)

        self._build_ui()
        self._bind_settings_change_events()
        self._load_session_settings()
        if self._last_rounds:
            self._render_rounds(self._last_rounds)
        self.settings_popup.hide()

    def _build_ui(self) -> None:
        """Compose all widgets into the main layout."""
        self.title_label = QLabel(config.APP_TITLE_TEXT)
        self.title_label.setObjectName("resultTitle")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.title_label.setCursor(Qt.CursorShape.PointingHandCursor)
        self.title_label.mousePressEvent = self._on_title_clicked
        self.title_label.setText(self._current_title_text())

        top_bar = QHBoxLayout()
        top_bar.setContentsMargins(0, 8, 0, 10)
        top_bar.setSpacing(0)

        self.right_controls = QWidget()
        self.right_controls.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
        right_layout = QHBoxLayout()
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(10)
        right_layout.addWidget(self.export_pdf_button)
        right_layout.addWidget(self.settings_toggle)
        self.right_controls.setLayout(right_layout)

        self.left_title_spacer = QWidget()
        self.left_title_spacer.setFixedWidth(self.right_controls.sizeHint().width())
        top_bar.addWidget(self.left_title_spacer)
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
        self._update_mode_controls()
        self.title_label.setText(self._current_title_text())
        self._sync_title_balance_width()

    def _sync_title_balance_width(self) -> None:
        """Keep title strictly centered by mirroring right controls width on the left."""
        if hasattr(self, "left_title_spacer") and hasattr(self, "right_controls"):
            self.left_title_spacer.setFixedWidth(self.right_controls.sizeHint().width())

    def on_generate_clicked(self) -> None:
        """Generate rounds and render or show validation error."""
        if self._pulse_timer.isActive():
            return
        if self.settings_popup.isVisible():
            self.settings_popup.hide()

        try:
            if self._is_dual_mode():
                ds_groups = self.groups_by_competition["DS"]
                d2w_groups = self.groups_by_competition["D2W_D4W"]
                rounds = generate_rounds(
                    round_count=self._round_value(self.ds_round_count),
                    snakes=ds_groups["snakes"].selected_elements(),
                    verticals=ds_groups["verticals"].selected_elements(),
                    mixers=ds_groups["mixers"].selected_elements(),
                    rng=random.Random(),
                )
                rounds_secondary = generate_rounds(
                    round_count=self._round_value(self.d2w_round_count),
                    snakes=d2w_groups["snakes"].selected_elements(),
                    verticals=d2w_groups["verticals"].selected_elements(),
                    mixers=d2w_groups["mixers"].selected_elements(),
                    rng=random.Random(),
                )
            else:
                selected = self._single_selected_competition_key()
                if selected is None:
                    raise ValueError("Select at least one competition: D2W or DS.")
                active_round_count = self._round_value(self.d2w_round_count) if selected == "D2W_D4W" else self._round_value(self.ds_round_count)
                active_groups = self.groups_by_competition[selected]
                rounds = generate_rounds(
                    round_count=active_round_count,
                    snakes=active_groups["snakes"].selected_elements(),
                    verticals=active_groups["verticals"].selected_elements(),
                    mixers=active_groups["mixers"].selected_elements(),
                    rng=random.Random(),
                )
                rounds_secondary = []
        except ValueError as exc:
            QMessageBox.warning(self, "Validation error", str(exc))
            return

        self._last_rounds = rounds
        self._last_secondary_rounds = rounds_secondary
        self._persisted_last_rounds = list(rounds)
        self._persisted_last_secondary_rounds = list(rounds_secondary)
        self._start_shuffle_pulse(rounds, rounds_secondary)
        self._save_current_settings()

    def on_toggle_settings_clicked(self) -> None:
        """Toggle popup visibility for element settings."""
        if self.settings_popup.isVisible():
            self.settings_popup.hide()
            return

        self._place_settings_popup()
        self.settings_popup.show()
        self.settings_popup.raise_()

    def _on_title_clicked(self, _event) -> None:
        """Start generation when user clicks the main title."""
        self.on_generate_clicked()

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
        if self._is_dual_mode() and self._last_secondary_rounds:
            self._render_dual_rounds(rounds, self._last_secondary_rounds)
            return
        for round_item in rounds:
            self._append_round_widget(round_item)

    def _calculate_result_sizes(self) -> tuple[int, int, int]:
        """Return fixed sizes; scrolling handles larger round counts."""
        return (34, 28, 74)

    def resizeEvent(self, event) -> None:  # noqa: N802
        """Re-render generated rounds so sizes adapt to new window dimensions."""
        super().resizeEvent(event)
        self._sync_title_balance_width()
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
        self._ensure_at_least_one_mode_selected()
        selections: dict[str, dict[str, list[str]]] = {}
        for key, group_set in self.groups_by_competition.items():
            selections[key] = {
                "snakes": group_set["snakes"].selected_codes(),
                "verticals": group_set["verticals"].selected_codes(),
                "mixers": group_set["mixers"].selected_codes(),
            }

        save_settings(
            {
                "selected_competitions": self._selected_competitions(),
                "rounds_by_competition": {
                    "D2W_D4W": self._round_value(self.d2w_round_count),
                    "DS": self._round_value(self.ds_round_count),
                },
                "selections": selections,
                "last_generated": {
                    "primary": self._serialize_rounds(self._persisted_last_rounds),
                    "secondary": self._serialize_rounds(self._persisted_last_secondary_rounds),
                },
            }
        )

    def _load_session_settings(self) -> None:
        """Restore previously saved settings when available."""
        settings = load_settings()
        if not settings:
            return

        rounds_by_competition = settings.get("rounds_by_competition")
        if isinstance(rounds_by_competition, dict):
            d2w_rounds = rounds_by_competition.get("D2W_D4W")
            ds_rounds = rounds_by_competition.get("DS")
            if isinstance(d2w_rounds, int):
                idx = self.d2w_round_count.findData(max(1, min(10, d2w_rounds)))
                if idx >= 0:
                    self.d2w_round_count.setCurrentIndex(idx)
            if isinstance(ds_rounds, int):
                idx = self.ds_round_count.findData(max(1, min(10, ds_rounds)))
                if idx >= 0:
                    self.ds_round_count.setCurrentIndex(idx)

        selections = settings.get("selections")
        if isinstance(selections, dict):
            for competition_key, selection_data in selections.items():
                if competition_key in self.groups_by_competition and isinstance(selection_data, dict):
                    self._apply_selection_to_groups(self.groups_by_competition[competition_key], selection_data)

        selected_competitions = settings.get("selected_competitions")
        if isinstance(selected_competitions, list):
            selected_set = {str(value) for value in selected_competitions}
            d2w_checked = "D2W_D4W" in selected_set
            ds_checked = "DS" in selected_set
            # Apply both checkboxes atomically to avoid intermediate dual-mode side effects.
            self.d2w_checkbox.blockSignals(True)
            self.ds_checkbox.blockSignals(True)
            self.d2w_checkbox.setChecked(d2w_checked)
            self.ds_checkbox.setChecked(ds_checked)
            self.d2w_checkbox.blockSignals(False)
            self.ds_checkbox.blockSignals(False)
            self._ensure_at_least_one_mode_selected()

        last_generated = settings.get("last_generated")
        if isinstance(last_generated, dict):
            primary = last_generated.get("primary")
            secondary = last_generated.get("secondary")
            if isinstance(primary, list):
                self._last_rounds = self._deserialize_rounds(primary)
                self._persisted_last_rounds = list(self._last_rounds)
            if isinstance(secondary, list):
                self._last_secondary_rounds = self._deserialize_rounds(secondary)
                self._persisted_last_secondary_rounds = list(self._last_secondary_rounds)

        self._update_mode_controls()
        self.title_label.setText(self._current_title_text())

    def _start_shuffle_pulse(self, rounds: list[Round], rounds_secondary: list[Round]) -> None:
        """Start short shuffle pulse animation before final result render."""
        self._clear_results()
        self._target_rounds = list(rounds)
        self._target_rounds_secondary = list(rounds_secondary)
        self._pulse_ticks = 0
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
            self.title_label.setText(self._current_title_text())
            self.title_label.setStyleSheet(self._default_title_style)
            self.right_controls.setVisible(True)
            self._last_secondary_rounds = list(self._target_rounds_secondary)
            self._render_rounds(self._target_rounds)
            return

        self._pulse_ticks += 1
        self._render_pulse_frame(len(self._target_rounds), len(self._target_rounds_secondary))

    def _render_pulse_frame(self, rounds_count: int, rounds_count_secondary: int) -> None:
        """Render one pulse frame with temporary shuffled cards."""
        self._clear_results()
        if self._is_dual_mode():
            ds_groups = self.groups_by_competition["DS"]
            d2w_groups = self.groups_by_competition["D2W_D4W"]
            ds_snakes = ds_groups["snakes"].selected_elements()
            ds_verticals = ds_groups["verticals"].selected_elements()
            ds_mixers = ds_groups["mixers"].selected_elements()
            d2w_snakes = d2w_groups["snakes"].selected_elements()
            d2w_verticals = d2w_groups["verticals"].selected_elements()
            d2w_mixers = d2w_groups["mixers"].selected_elements()
            if not ds_snakes or not ds_verticals or not ds_mixers:
                return
            if not d2w_snakes or not d2w_verticals or not d2w_mixers:
                return

            fake_ds: list[Round] = []
            fake_d2w: list[Round] = []
            for idx in range(rounds_count):
                fake_ds.append(
                    Round(
                        number=idx + 1,
                        snake=random.choice(ds_snakes),
                        vertical=random.choice(ds_verticals),
                        mixer=random.choice(ds_mixers),
                    )
                )
            for idx in range(rounds_count_secondary):
                fake_d2w.append(
                    Round(
                        number=idx + 1,
                        snake=random.choice(d2w_snakes),
                        vertical=random.choice(d2w_verticals),
                        mixer=random.choice(d2w_mixers),
                    )
                )
            self._render_dual_rounds(fake_ds, fake_d2w)
            return

        selected = self._single_selected_competition_key()
        if selected is None:
            return
        active_groups = self.groups_by_competition[selected]
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
        row_layout.setColumnStretch(0, 1)
        row_layout.setColumnStretch(1, 1)
        row_layout.setColumnStretch(2, 1)

        cards = [
            f"{round_item.snake.code} {round_item.snake.name}",
            f"{round_item.vertical.code} {round_item.vertical.name}",
            f"{round_item.mixer.code} {round_item.mixer.name}",
        ]
        for idx, text in enumerate(cards):
            card = QLabel(text)
            card.setObjectName("resultCard")
            card.setMinimumHeight(card_height)
            card.setMinimumWidth(0)
            card.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Fixed)
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

    def _build_competition_groups(self) -> None:
        """Create fixed element group widgets for each competition."""
        for competition_key in self.competition_labels:
            if competition_key not in ("D2W_D4W", "DS"):
                continue
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
        layout.setContentsMargins(14, 10, 14, 10)
        layout.setSpacing(6)

        header_grid = QGridLayout()
        header_grid.setContentsMargins(0, 0, 0, 0)
        header_grid.setHorizontalSpacing(14)
        header_grid.setVerticalSpacing(2)

        left_header_box = QHBoxLayout()
        left_header_box.setSpacing(2)
        left_header_box.setContentsMargins(0, 0, 0, 0)
        self.ds_checkbox = QCheckBox("")
        self.ds_checkbox.setObjectName("popupHeaderCheckbox")
        self.ds_checkbox.setChecked(False)
        self.ds_checkbox.toggled.connect(self._on_ds_toggled)
        left_title = QLabel("DS")
        left_title.setObjectName("settingsColumnTitle")
        left_rounds_label = QLabel("Rounds")
        left_rounds_label.setObjectName("settingsRoundsLabel")
        self.ds_round_count = self._build_rounds_combobox()
        self.ds_round_count.currentIndexChanged.connect(self._on_rounds_changed)
        left_header_box.addWidget(self.ds_checkbox)
        left_header_box.addWidget(left_title)
        left_header_box.addStretch(1)
        left_header_box.addWidget(left_rounds_label)
        left_header_box.addWidget(self.ds_round_count)

        right_header_box = QHBoxLayout()
        right_header_box.setSpacing(2)
        right_header_box.setContentsMargins(0, 0, 0, 0)
        self.d2w_checkbox = QCheckBox("")
        self.d2w_checkbox.setObjectName("popupHeaderCheckbox")
        self.d2w_checkbox.setChecked(True)
        self.d2w_checkbox.toggled.connect(self._on_d2w_toggled)
        right_title = QLabel("D2W & D4W")
        right_title.setObjectName("settingsColumnTitle")
        right_rounds_label = QLabel("Rounds")
        right_rounds_label.setObjectName("settingsRoundsLabel")
        self.d2w_round_count = self._build_rounds_combobox()
        self.d2w_round_count.currentIndexChanged.connect(self._on_rounds_changed)
        right_header_box.addWidget(self.d2w_checkbox)
        right_header_box.addWidget(right_title)
        right_header_box.addStretch(1)
        right_header_box.addWidget(right_rounds_label)
        right_header_box.addWidget(self.d2w_round_count)

        left_header_widget = QWidget()
        left_header_widget.setLayout(left_header_box)
        right_header_widget = QWidget()
        right_header_widget.setLayout(right_header_box)

        header_grid.addWidget(left_header_widget, 0, 0)
        header_grid.addWidget(right_header_widget, 0, 1)
        header_grid.setColumnStretch(0, 1)
        header_grid.setColumnStretch(1, 1)
        layout.addLayout(header_grid)

        grid = QGridLayout()
        grid.setHorizontalSpacing(14)
        grid.setVerticalSpacing(7)
        grid.setContentsMargins(0, 0, 0, 0)

        left_key = "DS" if "DS" in self.competition_labels else next(iter(self.competition_labels))
        right_key = "D2W_D4W" if "D2W_D4W" in self.competition_labels else left_key

        categories = [("snakes", 0), ("verticals", 1), ("mixers", 2)]
        for name, row in categories:
            grid.addWidget(self.groups_by_competition[left_key][name], row, 0)
            grid.addWidget(self.groups_by_competition[right_key][name], row, 1)

        # Keep rows compact at the top; consume extra height in the trailing spacer row.
        grid.setRowStretch(3, 1)
        grid.setColumnStretch(0, 1)
        grid.setColumnStretch(1, 1)
        layout.addLayout(grid)
        content_widget.setLayout(layout)

        self.settings_popup_scroll = QScrollArea()
        self.settings_popup_scroll.setWidgetResizable(True)
        self.settings_popup_scroll.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        self.settings_popup_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.settings_popup_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.settings_popup_scroll.setWidget(content_widget)

        popup_layout = QVBoxLayout()
        popup_layout.setContentsMargins(0, 0, 0, 0)
        popup_layout.addWidget(self.settings_popup_scroll)
        self.settings_popup.setLayout(popup_layout)
        initial_size = self._settings_popup_size()
        self.settings_popup.resize(initial_size[0], initial_size[1])

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

    def on_export_pdf_clicked(self) -> None:
        """Export currently generated rounds to a printable PDF file."""
        if not self._last_rounds:
            QMessageBox.information(self, "Export PDF", "No generated rounds to export yet.")
            return

        default_name = f"draw_generators_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Save PDF",
            default_name,
            "PDF Files (*.pdf)",
        )
        if not file_path:
            return
        if not file_path.lower().endswith(".pdf"):
            file_path += ".pdf"

        try:
            printer = QPrinter(QPrinter.PrinterMode.HighResolution)
            printer.setOutputFormat(QPrinter.OutputFormat.PdfFormat)
            printer.setOutputFileName(file_path)
            printer.setResolution(300)
            page_layout = printer.pageLayout()
            page_layout.setUnits(QPageLayout.Unit.Millimeter)
            page_layout.setOrientation(QPageLayout.Orientation.Landscape)
            page_layout.setMargins(QMarginsF(12.7, 12.7, 12.7, 12.7))
            printer.setPageLayout(page_layout)

            document = QTextDocument()
            document.setDocumentMargin(0)
            document.setDefaultStyleSheet(
                "body { font-family: Arial; margin: 0; padding: 0; } "
                ".page-break { page-break-before: always; }"
            )
            document.setHtml(self._build_pdf_html())
            document.setPageSize(printer.pageRect(QPrinter.Unit.Point).size())
            document.print_(printer)
        except Exception as exc:  # pragma: no cover - GUI/IO path
            QMessageBox.warning(self, "Export PDF", f"Failed to export PDF:\n{exc}")
            return

        QMessageBox.information(self, "Export PDF", "PDF exported successfully.")

    def _build_pdf_html(self) -> str:
        """Build printable HTML representation of current generation result."""
        title = self._current_title_text()
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if self._is_dual_mode() and self._last_secondary_rounds:
            return (
                f"<h1 style='font-size:24pt;margin:0 0 6px 0;'>{escape(title)}</h1>"
                f"<p style='font-size:10pt;margin:0 0 8px 0;'>Generated: {generated_at}</p>"
                f"<h2 style='font-size:16pt;margin:0 0 6px 0;'>DS</h2>{self._build_rounds_table_html(self._last_rounds)}"
                f"<div class='page-break'></div>"
                f"<h2 style='font-size:16pt;margin:0 0 6px 0;'>D2W &amp; D4W</h2>{self._build_rounds_table_html(self._last_secondary_rounds)}"
            )
        return (
            f"<h1 style='font-size:24pt;margin:0 0 6px 0;'>{escape(title)}</h1>"
            f"<p style='font-size:10pt;margin:0 0 8px 0;'>Generated: {generated_at}</p>"
            f"{self._build_rounds_table_html(self._last_rounds)}"
        )

    def _build_rounds_table_html(self, rounds: list[Round]) -> str:
        """Return HTML table for rounds list."""
        font_size, header_font_size, cell_padding = self._pdf_table_metrics(rounds)
        rows = []
        for round_item in rounds:
            rows.append(
                "<tr>"
                f"<td style='border:1px solid #555;padding:{cell_padding}px;'>{round_item.number}</td>"
                f"<td style='border:1px solid #555;padding:{cell_padding}px;word-break:break-word;'>{escape(round_item.snake.code)} - {escape(round_item.snake.name)}</td>"
                f"<td style='border:1px solid #555;padding:{cell_padding}px;word-break:break-word;'>{escape(round_item.vertical.code)} - {escape(round_item.vertical.name)}</td>"
                f"<td style='border:1px solid #555;padding:{cell_padding}px;word-break:break-word;'>{escape(round_item.mixer.code)} - {escape(round_item.mixer.name)}</td>"
                "</tr>"
            )
        return (
            "<table style='width:100%;border-collapse:collapse;table-layout:fixed;'>"
            "<colgroup><col style='width:8%;'/><col style='width:31%;'/><col style='width:30%;'/><col style='width:31%;'/></colgroup>"
            f"<thead style='font-size:{header_font_size}pt;'><tr>"
            f"<th style='border:1px solid #555;padding:{cell_padding}px;background:#efefef;'>Round</th>"
            f"<th style='border:1px solid #555;padding:{cell_padding}px;background:#efefef;'>Snake</th>"
            f"<th style='border:1px solid #555;padding:{cell_padding}px;background:#efefef;'>Vertical</th>"
            f"<th style='border:1px solid #555;padding:{cell_padding}px;background:#efefef;'>Mixer</th>"
            "</tr></thead>"
            f"<tbody style='font-size:{font_size}pt;'>{''.join(rows)}</tbody>"
            "</table>"
        )

    def _pdf_table_metrics(self, rounds: list[Round]) -> tuple[int, int, int]:
        """Return compact typography that keeps content on one page."""
        max_len = 0
        for round_item in rounds:
            max_len = max(
                max_len,
                len(f"{round_item.snake.code} - {round_item.snake.name}"),
                len(f"{round_item.vertical.code} - {round_item.vertical.name}"),
                len(f"{round_item.mixer.code} - {round_item.mixer.name}"),
            )

        if len(rounds) >= 10 or max_len >= 34:
            return (10, 11, 4)
        if len(rounds) >= 8 or max_len >= 28:
            return (11, 12, 5)
        return (12, 13, 6)

    def _is_dual_mode(self) -> bool:
        """Return True when combined DS + D2W mode is selected."""
        selected = self._selected_competitions()
        return "D2W_D4W" in selected and "DS" in selected

    def _current_title_text(self) -> str:
        """Return top title for currently selected generation mode."""
        if self._is_dual_mode():
            return "DS + D2W"
        selected = self._single_selected_competition_key()
        if selected is None:
            return "Select Competition"
        return "D2W & D4W" if selected == "D2W_D4W" else "DS"

    def _selected_competitions(self) -> list[str]:
        """Return selected competition keys in fixed order."""
        selected: list[str] = []
        if hasattr(self, "d2w_checkbox") and self.d2w_checkbox.isChecked():
            selected.append("D2W_D4W")
        if hasattr(self, "ds_checkbox") and self.ds_checkbox.isChecked():
            selected.append("DS")
        return selected

    def _single_selected_competition_key(self) -> str | None:
        """Return single selected competition key or None."""
        selected = self._selected_competitions()
        if len(selected) != 1:
            return None
        return selected[0]

    def _on_ds_toggled(self, checked: bool) -> None:
        """Prevent disabling the last active checkbox (DS toggle)."""
        if not checked and not self.d2w_checkbox.isChecked():
            with QSignalBlocker(self.ds_checkbox):
                self.ds_checkbox.setChecked(True)
            return
        self._on_mode_changed()

    def _on_d2w_toggled(self, checked: bool) -> None:
        """Prevent disabling the last active checkbox (D2W toggle)."""
        if not checked and not self.ds_checkbox.isChecked():
            with QSignalBlocker(self.d2w_checkbox):
                self.d2w_checkbox.setChecked(True)
            return
        self._on_mode_changed()

    def _on_mode_changed(self) -> None:
        """Handle D2W/DS checkbox changes and keep title/settings updated."""
        self._ensure_at_least_one_mode_selected()
        self._update_mode_controls()
        self.title_label.setText(self._current_title_text())
        self._last_rounds = []
        self._last_secondary_rounds = []
        self._render_empty_scheme()
        self._save_current_settings()

    def _ensure_at_least_one_mode_selected(self, preferred_box: QCheckBox | None = None) -> None:
        """Ensure that at least one competition mode checkbox stays selected."""
        if self.d2w_checkbox.isChecked() or self.ds_checkbox.isChecked():
            return

        target = preferred_box if preferred_box in (self.d2w_checkbox, self.ds_checkbox) else self.d2w_checkbox
        with QSignalBlocker(target):
            target.setChecked(True)

    def _update_mode_controls(self) -> None:
        """Enable/disable round counters depending on selected competitions."""
        self.d2w_round_count.setEnabled(self.d2w_checkbox.isChecked())
        self.ds_round_count.setEnabled(self.ds_checkbox.isChecked())

    def _on_rounds_changed(self) -> None:
        """Refresh empty scheme when rounds values change before generation."""
        self._last_rounds = []
        self._last_secondary_rounds = []
        self._render_empty_scheme()
        self._save_current_settings()

    def _build_rounds_combobox(self) -> QComboBox:
        """Build fixed rounds selector with values 1..10."""
        box = QComboBox()
        box.setObjectName("roundCountBox")
        for value in range(1, 11):
            box.addItem(str(value), value)
        box.setCurrentIndex(4)
        return box

    def _round_value(self, box: QComboBox) -> int:
        """Return selected rounds integer from combobox."""
        value = box.currentData()
        return int(value) if value is not None else 1

    def _serialize_rounds(self, rounds: list[Round]) -> list[dict]:
        """Serialize rounds for storing in JSON settings."""
        return [
            {
                "number": round_item.number,
                "snake": {"code": round_item.snake.code, "name": round_item.snake.name},
                "vertical": {"code": round_item.vertical.code, "name": round_item.vertical.name},
                "mixer": {"code": round_item.mixer.code, "name": round_item.mixer.name},
            }
            for round_item in rounds
        ]

    def _deserialize_rounds(self, payload: list[dict]) -> list[Round]:
        """Deserialize rounds from JSON settings payload."""
        rounds: list[Round] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            number = item.get("number")
            snake = item.get("snake")
            vertical = item.get("vertical")
            mixer = item.get("mixer")
            if not isinstance(number, int):
                continue
            if not (isinstance(snake, dict) and isinstance(vertical, dict) and isinstance(mixer, dict)):
                continue
            snake_code = snake.get("code")
            snake_name = snake.get("name")
            vertical_code = vertical.get("code")
            vertical_name = vertical.get("name")
            mixer_code = mixer.get("code")
            mixer_name = mixer.get("name")
            if not all(isinstance(v, str) for v in (snake_code, snake_name, vertical_code, vertical_name, mixer_code, mixer_name)):
                continue
            rounds.append(
                Round(
                    number=number,
                    snake=Element(code=snake_code, name=snake_name),
                    vertical=Element(code=vertical_code, name=vertical_name),
                    mixer=Element(code=mixer_code, name=mixer_name),
                )
            )
        return rounds


    def _render_dual_rounds(self, ds_rounds: list[Round], d2w_rounds: list[Round]) -> None:
        """Render two synchronized columns: DS (left) and D2W (right)."""
        container = QWidget()
        layout = QHBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(16)

        left_col = self._build_dual_column("DS", ds_rounds)
        right_col = self._build_dual_column("D2W", d2w_rounds)
        divider = QFrame()
        divider.setObjectName("dualDivider")
        divider.setFrameShape(QFrame.Shape.VLine)
        divider.setLineWidth(1)

        layout.addWidget(left_col, 1)
        layout.addWidget(divider)
        layout.addWidget(right_col, 1)
        container.setLayout(layout)
        self.result_layout.insertWidget(self.result_layout.count() - 1, container)

    def _render_empty_scheme(self) -> None:
        """Render empty card scheme for current mode and rounds selection."""
        self._clear_results()
        if self._is_dual_mode():
            container = QWidget()
            layout = QHBoxLayout()
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(16)
            left_col = self._build_dual_column("DS", [], self._round_value(self.ds_round_count))
            right_col = self._build_dual_column("D2W", [], self._round_value(self.d2w_round_count))
            divider = QFrame()
            divider.setObjectName("dualDivider")
            divider.setFrameShape(QFrame.Shape.VLine)
            divider.setLineWidth(1)
            layout.addWidget(left_col, 1)
            layout.addWidget(divider)
            layout.addWidget(right_col, 1)
            container.setLayout(layout)
            self.result_layout.insertWidget(self.result_layout.count() - 1, container)
            return

        selected = self._single_selected_competition_key()
        if selected is None:
            return
        rounds_count = self._round_value(self.d2w_round_count) if selected == "D2W_D4W" else self._round_value(self.ds_round_count)
        for number in range(1, rounds_count + 1):
            self._append_empty_round_widget(number)

    def _append_empty_round_widget(self, number: int) -> None:
        """Append one empty round block with three blank cards."""
        round_font_size, card_font_size, card_height = self._calculate_result_sizes()
        round_label = QLabel(f"Round {number}")
        round_label.setObjectName("roundLabel")
        round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        round_label.setStyleSheet(f"font-size: {round_font_size}px;")
        self.result_layout.insertWidget(self.result_layout.count() - 1, round_label)

        row = QWidget()
        row_layout = QGridLayout()
        row_layout.setHorizontalSpacing(22)
        row_layout.setVerticalSpacing(0)
        row_layout.setContentsMargins(0, 0, 0, 0)
        row_layout.setColumnStretch(0, 1)
        row_layout.setColumnStretch(1, 1)
        row_layout.setColumnStretch(2, 1)
        for idx in range(3):
            card = QLabel("")
            card.setObjectName("resultCard")
            card.setMinimumHeight(card_height)
            card.setMinimumWidth(0)
            card.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Fixed)
            card.setAlignment(Qt.AlignmentFlag.AlignCenter)
            card.setWordWrap(False)
            card.setStyleSheet(f"font-size: {card_font_size}px;")
            row_layout.addWidget(card, 0, idx)
        row.setLayout(row_layout)
        self.result_layout.insertWidget(self.result_layout.count() - 1, row)

    def _build_dual_column(self, title: str, rounds: list[Round], rounds_count: int | None = None) -> QWidget:
        """Build one side in dual mode with round titles and 3 cards per round."""
        column = QWidget()
        col_layout = QVBoxLayout()
        col_layout.setContentsMargins(0, 0, 0, 0)
        col_layout.setSpacing(10)

        title_label = QLabel(title)
        title_label.setObjectName("dualColumnTitle")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        col_layout.addWidget(title_label)

        round_font_size, card_font_size, card_height = self._calculate_result_sizes()
        if rounds_count is None:
            rounds_count = len(rounds)

        for idx in range(rounds_count):
            round_item = rounds[idx] if idx < len(rounds) else None
            round_number = round_item.number if round_item is not None else idx + 1
            round_label = QLabel(f"Round {round_number}")
            round_label.setObjectName("roundLabel")
            round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            round_label.setStyleSheet(f"font-size: {round_font_size}px;")
            col_layout.addWidget(round_label)

            row = QWidget()
            row_layout = QGridLayout()
            row_layout.setHorizontalSpacing(10)
            row_layout.setVerticalSpacing(0)
            row_layout.setContentsMargins(0, 0, 0, 0)
            row_layout.setColumnStretch(0, 1)
            row_layout.setColumnStretch(1, 1)
            row_layout.setColumnStretch(2, 1)
            if round_item is None:
                cards = ["", "", ""]
            else:
                cards = [
                    f"{round_item.snake.code} {round_item.snake.name}",
                    f"{round_item.vertical.code} {round_item.vertical.name}",
                    f"{round_item.mixer.code} {round_item.mixer.name}",
                ]
            for idx, text in enumerate(cards):
                card = QLabel(text)
                card.setObjectName("dualResultCard")
                card.setMinimumHeight(card_height)
                card.setMinimumWidth(0)
                card.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Fixed)
                card.setAlignment(Qt.AlignmentFlag.AlignCenter)
                card.setWordWrap(True)
                row_layout.addWidget(card, 0, idx)
            row.setLayout(row_layout)
            col_layout.addWidget(row)

        col_layout.addStretch(1)
        column.setLayout(col_layout)
        return column
