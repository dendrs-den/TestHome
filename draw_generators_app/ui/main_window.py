"""Main window for Draw Generators app."""

from __future__ import annotations

import random
from datetime import datetime
from html import escape
from pathlib import Path

from PySide6.QtCore import QEvent, QSignalBlocker, QTimer, Qt
from PySide6.QtCore import QMarginsF
from PySide6.QtGui import QDesktopServices, QFont, QPageLayout, QTextDocument
from PySide6.QtPrintSupport import QPrinter
from PySide6.QtWidgets import (
    QComboBox,
    QCheckBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QScrollArea,
    QSizePolicy,
    QToolButton,
    QVBoxLayout,
    QWidget,
)
from PySide6.QtCore import QUrl

import config
from core.generator import generate_rounds
from core.models import Element, Round
from ui.styles import get_app_stylesheet
from ui.widgets import ElementGroupWidget
from utils.helpers import tuples_to_elements
from utils.session_settings import load_settings, save_settings


class MainWindow(QMainWindow):
    """Main app window with settings and generated result."""
    _DEFAULT_PULSE_PREVIEW_ROUNDS = 5
    _MONO_CARD_FONT_PX = 30

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
        self.settings_toggle.setCursor(Qt.CursorShape.PointingHandCursor)
        self.export_pdf_button = QToolButton()
        self.export_pdf_button.setObjectName("exportPdfButton")
        self.export_pdf_button.setText("PDF")
        self.export_pdf_button.setToolTip("Export current generation result to PDF")
        self.export_pdf_button.setCursor(Qt.CursorShape.PointingHandCursor)

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
        self._suppress_result_scroll = False
        self.result_scroll.viewport().installEventFilter(self)
        self._last_rounds: list[Round] = []
        self._pulse_timer = QTimer(self)
        self._pulse_timer.timeout.connect(self._on_pulse_tick)
        self._target_rounds: list[Round] = []
        self._target_rounds_secondary: list[Round] = []
        self._pulse_single_pool: dict[str, list[Element]] = {}
        self._pulse_dual_pools: dict[str, dict[str, list[Element]]] = {}
        self._pulse_ticks = 0
        self._pulse_total_ticks = config.ANIMATION_STEP_COUNT
        self._cached_round_font_size = -1
        self._cached_card_font_size = -1
        self._cached_round_label_font = QFont()
        self._cached_card_label_font = QFont()
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
        self.result_container.setUpdatesEnabled(False)
        try:
            self._clear_results()
            if self._is_dual_mode() and self._last_secondary_rounds:
                self._render_dual_rounds(rounds, self._last_secondary_rounds)
                return
            if self._should_use_two_column_mono(len(rounds)):
                self._render_mono_two_columns(rounds)
                return
            mono_card_font = self._mono_fixed_card_font()
            for round_item in rounds:
                self._append_round_widget(round_item, card_font_override=mono_card_font, wrap_cards=True)
        finally:
            self.result_container.setUpdatesEnabled(True)
            self.result_container.update()

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
        self._pulse_single_pool = {}
        self._pulse_dual_pools = {}
        self._prepare_pulse_pools()
        self._pulse_ticks = 0
        self.right_controls.setEnabled(False)
        self._suppress_result_scroll = True
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
            self.right_controls.setEnabled(True)
            self._suppress_result_scroll = False
            self._pulse_single_pool = {}
            self._pulse_dual_pools = {}
            self._last_secondary_rounds = list(self._target_rounds_secondary)
            self._render_rounds(self._target_rounds)
            return

        self._pulse_ticks += 1
        self._render_pulse_frame(len(self._target_rounds), len(self._target_rounds_secondary))

    def _render_pulse_frame(self, rounds_count: int, rounds_count_secondary: int) -> None:
        """Render one pulse frame with temporary shuffled cards.

        To keep animation responsive on low-end machines, show only a compact
        preview subset during pulse and render full data only at the end.
        """
        self.result_container.setUpdatesEnabled(False)
        try:
            self._clear_results()
            preview_limit = self._pulse_preview_rounds_limit()
            preview_rounds = rounds_count
            preview_secondary = min(rounds_count_secondary, preview_limit)
            if self._is_dual_mode():
                preview_rounds = min(rounds_count, preview_limit)
                ds_pool = self._pulse_dual_pools.get("DS", {})
                d2w_pool = self._pulse_dual_pools.get("D2W_D4W", {})
                ds_snakes = ds_pool.get("snakes", [])
                ds_verticals = ds_pool.get("verticals", [])
                ds_mixers = ds_pool.get("mixers", [])
                d2w_snakes = d2w_pool.get("snakes", [])
                d2w_verticals = d2w_pool.get("verticals", [])
                d2w_mixers = d2w_pool.get("mixers", [])
                if not ds_snakes or not ds_verticals or not ds_mixers:
                    return
                if not d2w_snakes or not d2w_verticals or not d2w_mixers:
                    return

                fake_ds: list[Round] = []
                fake_d2w: list[Round] = []
                for idx in range(preview_rounds):
                    fake_ds.append(
                        Round(
                            number=idx + 1,
                            snake=random.choice(ds_snakes),
                            vertical=random.choice(ds_verticals),
                            mixer=random.choice(ds_mixers),
                        )
                    )
                for idx in range(preview_secondary):
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
            snakes = self._pulse_single_pool.get("snakes", [])
            verticals = self._pulse_single_pool.get("verticals", [])
            mixers = self._pulse_single_pool.get("mixers", [])
            if not snakes or not verticals or not mixers:
                return

            use_two_columns = self._should_use_two_column_mono(rounds_count)
            pulse_rounds: list[Round] = []
            for idx in range(preview_rounds):
                fake_round = Round(
                    number=idx + 1,
                    snake=random.choice(snakes),
                    vertical=random.choice(verticals),
                    mixer=random.choice(mixers),
                )
                pulse_rounds.append(fake_round)
            if use_two_columns:
                self._render_mono_two_columns(pulse_rounds, rounds_count=rounds_count)
                return
            mono_card_font = self._mono_fixed_card_font()
            for fake_round in pulse_rounds:
                self._append_round_widget(fake_round, card_font_override=mono_card_font, wrap_cards=True)
        finally:
            self.result_container.setUpdatesEnabled(True)
            self.result_container.update()

    def _prepare_pulse_pools(self) -> None:
        """Cache selected pools once before animation ticks to reduce UI overhead."""
        if self._is_dual_mode():
            ds_groups = self.groups_by_competition["DS"]
            d2w_groups = self.groups_by_competition["D2W_D4W"]
            self._pulse_dual_pools = {
                "DS": {
                    "snakes": ds_groups["snakes"].selected_elements(),
                    "verticals": ds_groups["verticals"].selected_elements(),
                    "mixers": ds_groups["mixers"].selected_elements(),
                },
                "D2W_D4W": {
                    "snakes": d2w_groups["snakes"].selected_elements(),
                    "verticals": d2w_groups["verticals"].selected_elements(),
                    "mixers": d2w_groups["mixers"].selected_elements(),
                },
            }
            return

        selected = self._single_selected_competition_key()
        if selected is None:
            return
        groups = self.groups_by_competition[selected]
        self._pulse_single_pool = {
            "snakes": groups["snakes"].selected_elements(),
            "verticals": groups["verticals"].selected_elements(),
            "mixers": groups["mixers"].selected_elements(),
        }

    def _pulse_preview_rounds_limit(self) -> int:
        """Return configured preview rounds count for pulse animation."""
        value = getattr(config, "ANIMATION_PREVIEW_ROUNDS", self._DEFAULT_PULSE_PREVIEW_ROUNDS)
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return self._DEFAULT_PULSE_PREVIEW_ROUNDS
        return max(1, parsed)

    def _append_round_widget(self, round_item: Round, card_font_override: QFont | None = None, wrap_cards: bool = True) -> None:
        """Append one round block into results container."""
        round_font_size, card_font_size, _card_height_probe = self._calculate_result_sizes()
        round_font, card_font, card_height = self._result_metrics()
        effective_card_font = card_font_override or card_font
        round_label = QLabel(f"Round {round_item.number}")
        round_label.setObjectName("roundLabel")
        round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        round_label.setFont(round_font)
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
            card.setWordWrap(wrap_cards)
            card.setFont(effective_card_font)
            effective_size = effective_card_font.pixelSize() if effective_card_font.pixelSize() > 0 else card_font_size
            card.setStyleSheet(f"font-size: {effective_size}px;")
            row_layout.addWidget(card, 0, idx)

        row.setLayout(row_layout)
        self.result_layout.insertWidget(self.result_layout.count() - 1, row)

    def _mono_fixed_card_font(self) -> QFont:
        """Return fixed mono-mode card font size."""
        _round_font, base_card_font, _card_height = self._result_metrics()
        fixed = QFont(base_card_font)
        fixed.setPixelSize(self._MONO_CARD_FONT_PX)
        return fixed

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
        self.ds_title_input = QLineEdit(self.competition_labels.get("DS", "DS"))
        self.ds_title_input.setObjectName("settingsTitleInput")
        self.ds_title_input.editingFinished.connect(lambda: self._on_competition_title_edited("DS", self.ds_title_input))
        left_rounds_label = QLabel("Rounds")
        left_rounds_label.setObjectName("settingsRoundsLabel")
        self.ds_round_count = self._build_rounds_combobox()
        self.ds_round_count.currentIndexChanged.connect(self._on_rounds_changed)
        left_header_box.addWidget(self.ds_checkbox)
        left_header_box.addWidget(self.ds_title_input)
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
        self.d2w_title_input = QLineEdit(self.competition_labels.get("D2W_D4W", "D2W & D4W"))
        self.d2w_title_input.setObjectName("settingsTitleInput")
        self.d2w_title_input.editingFinished.connect(lambda: self._on_competition_title_edited("D2W_D4W", self.d2w_title_input))
        right_rounds_label = QLabel("Rounds")
        right_rounds_label.setObjectName("settingsRoundsLabel")
        self.d2w_round_count = self._build_rounds_combobox()
        self.d2w_round_count.currentIndexChanged.connect(self._on_rounds_changed)
        right_header_box.addWidget(self.d2w_checkbox)
        right_header_box.addWidget(self.d2w_title_input)
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

        columns_header_grid = QGridLayout()
        columns_header_grid.setContentsMargins(0, 2, 0, 0)
        columns_header_grid.setHorizontalSpacing(14)

        left_column_title = QLabel("DS")
        left_column_title.setObjectName("settingsColumnTitle")
        left_column_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        right_column_title = QLabel("D2W & D4W")
        right_column_title.setObjectName("settingsColumnTitle")
        right_column_title.setAlignment(Qt.AlignmentFlag.AlignCenter)

        columns_header_grid.addWidget(left_column_title, 0, 0)
        columns_header_grid.addWidget(right_column_title, 0, 1)
        columns_header_grid.setColumnStretch(0, 1)
        columns_header_grid.setColumnStretch(1, 1)
        layout.addLayout(columns_header_grid)

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

        self._show_export_success_dialog(file_path)

    def _show_export_success_dialog(self, file_path: str) -> None:
        """Show export success dialog with optional quick folder open action."""
        message = QMessageBox(self)
        message.setIcon(QMessageBox.Icon.Information)
        message.setWindowTitle("Export PDF")
        message.setText("PDF exported successfully.")
        message.setStyleSheet(
            "QLabel { color: #000000; }"
            "QPushButton { min-width: 110px; }"
        )
        open_folder_button = message.addButton("Open Folder", QMessageBox.ButtonRole.ActionRole)
        message.addButton("Close", QMessageBox.ButtonRole.RejectRole)
        message.exec()
        if message.clickedButton() == open_folder_button:
            target_dir = Path(file_path).resolve().parent
            QDesktopServices.openUrl(QUrl.fromLocalFile(str(target_dir)))

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
        selected = self._selected_competitions()
        if not selected:
            return "Select Competition"
        titles = [self.competition_labels.get(key, key).strip() for key in selected]
        visible_titles = [title for title in titles if title]
        if not visible_titles:
            return "Start"
        return " ".join(visible_titles)

    def _on_competition_title_edited(self, competition_key: str, field: QLineEdit) -> None:
        """Apply and persist custom competition title from settings popup."""
        new_title = field.text().strip()
        self.competition_labels[competition_key] = new_title
        field.setText(new_title)
        self.title_label.setText(self._current_title_text())
        if not config.save_competition_title(competition_key, new_title):
            # Keep UI text but notify about persistence issue.
            QMessageBox.warning(self, "Settings", "Failed to save competition title to DrawGenerators.cfg.")

    def eventFilter(self, watched, event):  # noqa: N802
        """Block results scrolling while generation pulse animation is active."""
        if watched == self.result_scroll.viewport() and self._suppress_result_scroll and event.type() == QEvent.Type.Wheel:
            return True
        return super().eventFilter(watched, event)

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
        box.setCursor(Qt.CursorShape.PointingHandCursor)
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
        self.result_container.setUpdatesEnabled(False)
        try:
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
            if self._should_use_two_column_mono(rounds_count):
                self._render_mono_two_columns([], rounds_count=rounds_count)
                return
            for number in range(1, rounds_count + 1):
                self._append_empty_round_widget(number)
        finally:
            self.result_container.setUpdatesEnabled(True)
            self.result_container.update()

    def _append_empty_round_widget(self, number: int) -> None:
        """Append one empty round block with three blank cards."""
        round_font_size, card_font_size, _card_height_probe = self._calculate_result_sizes()
        round_font, card_font, card_height = self._result_metrics()
        round_label = QLabel(f"Round {number}")
        round_label.setObjectName("roundLabel")
        round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        round_label.setFont(round_font)
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
            card.setFont(card_font)
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

        round_font_size, _card_font_size, _card_height_probe = self._calculate_result_sizes()
        round_font, _card_font, card_height = self._result_metrics()
        if rounds_count is None:
            rounds_count = len(rounds)

        for idx in range(rounds_count):
            round_item = rounds[idx] if idx < len(rounds) else None
            round_number = round_item.number if round_item is not None else idx + 1
            round_label = QLabel(f"Round {round_number}")
            round_label.setObjectName("roundLabel")
            round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            round_label.setFont(round_font)
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

    def _should_use_two_column_mono(self, rounds_count: int) -> bool:
        """Return True when mono-mode layout should switch to two columns."""
        return rounds_count > 5

    def _render_mono_two_columns(self, rounds: list[Round], rounds_count: int | None = None) -> None:
        """Render mono mode in two columns for better readability with many rounds."""
        total = rounds_count if rounds_count is not None else len(rounds)
        left_count = (total + 1) // 2
        right_count = total - left_count
        left_rounds = rounds[:left_count]
        right_rounds = rounds[left_count:]

        container = QWidget()
        layout = QHBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(16)

        left_col = self._build_mono_column(left_rounds, start_number=1, rounds_count=left_count)
        right_col = self._build_mono_column(right_rounds, start_number=left_count + 1, rounds_count=right_count)
        divider = QFrame()
        divider.setObjectName("dualDivider")
        divider.setFrameShape(QFrame.Shape.VLine)
        divider.setLineWidth(1)

        layout.addWidget(left_col, 1)
        layout.addWidget(divider)
        layout.addWidget(right_col, 1)
        container.setLayout(layout)
        self.result_layout.insertWidget(self.result_layout.count() - 1, container)

    def _build_mono_column(self, rounds: list[Round], start_number: int, rounds_count: int) -> QWidget:
        """Build one column for mono-mode two-column layout."""
        column = QWidget()
        col_layout = QVBoxLayout()
        col_layout.setContentsMargins(0, 0, 0, 0)
        col_layout.setSpacing(10)

        round_font_size, _card_font_size, card_height = self._calculate_result_sizes()

        for idx in range(rounds_count):
            round_item = rounds[idx] if idx < len(rounds) else None
            round_number = round_item.number if round_item is not None else start_number + idx
            round_label = QLabel(f"Round {round_number}")
            round_label.setObjectName("roundLabel")
            round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            round_label.setStyleSheet(f"font-size: {round_font_size}px;")
            col_layout.addWidget(round_label)

            row = QWidget()
            row_layout = QGridLayout()
            row_layout.setHorizontalSpacing(22)
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
            for card_idx, text in enumerate(cards):
                card = QLabel(text)
                # Use dual-mode card style/typography when mono mode is split into two columns.
                card.setObjectName("dualResultCard")
                card.setMinimumHeight(card_height)
                card.setMinimumWidth(0)
                card.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Fixed)
                card.setAlignment(Qt.AlignmentFlag.AlignCenter)
                card.setWordWrap(True)
                row_layout.addWidget(card, 0, card_idx)

            row.setLayout(row_layout)
            col_layout.addWidget(row)

        col_layout.addStretch(1)
        column.setLayout(col_layout)
        return column
    def _result_metrics(self) -> tuple[QFont, QFont, int]:
        """Return cached fonts and card height for result rendering."""
        round_font_size, card_font_size, card_height = self._calculate_result_sizes()
        if self._cached_round_font_size != round_font_size:
            self._cached_round_label_font = QFont()
            self._cached_round_label_font.setPixelSize(round_font_size)
            self._cached_round_font_size = round_font_size
        if self._cached_card_font_size != card_font_size:
            self._cached_card_label_font = QFont()
            self._cached_card_label_font.setPixelSize(card_font_size)
            self._cached_card_font_size = card_font_size
        return (self._cached_round_label_font, self._cached_card_label_font, card_height)
