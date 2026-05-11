"""Main window for Flyer Generators app."""

from __future__ import annotations

import random
from datetime import datetime
from html import escape

from PySide6.QtCore import QEvent, QMarginsF, QTimer, Qt, Signal
from PySide6.QtGui import QFont, QFontMetrics, QPageLayout, QTextDocument
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
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QLineEdit,
    QToolButton,
    QVBoxLayout,
    QWidget,
)
from shiboken6 import isValid

import config
from core.generator import generate_team_rounds
from core.models import Participant, TeamRound
from core.validators import validate_participant
from ui.styles import get_app_stylesheet
from utils.helpers import format_participant
from utils.session_settings import load_settings, save_settings

ORDER_WIDTH = 28
ROW_SPACING = 10
NAME_WIDTH = 500
NUMBER_WIDTH = 84
ACTIONS_CAPTAIN_WIDTH = 78
ACTIONS_WIDTH = 156
PARTICIPANT_CARD_HEIGHT = 56


class ParticipantRowWidget(QWidget):
    """Row widget for participant list in settings popup."""

    selected = Signal(int)
    edit_requested = Signal(int)
    delete_requested = Signal(int)
    commit_requested = Signal(int, str, str)
    captain_toggled = Signal(int, bool)
    number_focus_requested = Signal(int)
    navigate_requested = Signal(int, int, str)
    cancel_requested = Signal(int)

    def __init__(self, index: int, participant: Participant) -> None:
        super().__init__()
        self.index = index
        self._selected = False
        self._editing = False
        self.setObjectName("participantRow")
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setProperty("captain", participant.is_captain)

        layout = QHBoxLayout()
        layout.setContentsMargins(0, 4, 0, 4)
        layout.setSpacing(ROW_SPACING)

        self.order_label = QLabel(f"{index + 1:02d}")
        self.order_label.setObjectName("participantOrder")
        self.order_label.setFixedWidth(ORDER_WIDTH)

        self.name_field = QLineEdit(participant.full_name)
        self.name_field.setObjectName("participantField")
        self.name_field.setReadOnly(True)
        self.name_field.setMaxLength(30)
        self.name_field.setFixedWidth(NAME_WIDTH)
        self.name_field.setFocusPolicy(Qt.FocusPolicy.ClickFocus)

        self.number_field = QLineEdit(participant.number)
        self.number_field.setObjectName("participantNumberField")
        self.number_field.setReadOnly(True)
        self.number_field.setFixedWidth(NUMBER_WIDTH)
        self.number_field.setFocusPolicy(Qt.FocusPolicy.ClickFocus)

        self.captain_checkbox = QCheckBox("")
        self.captain_checkbox.setObjectName("participantCaptainCheckbox")
        self.captain_checkbox.setChecked(participant.is_captain)
        self.captain_checkbox.setFixedWidth(ACTIONS_CAPTAIN_WIDTH)
        self.captain_checkbox.setFocusPolicy(Qt.FocusPolicy.ClickFocus)

        self.delete_button = QPushButton("Del")
        self.delete_button.setObjectName("rowActionButton")
        self.edit_button = QPushButton("Edit")
        self.edit_button.setObjectName("rowActionButton")
        self.delete_button.setFixedWidth(72)
        self.edit_button.setFixedWidth(72)
        self.delete_button.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.edit_button.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.delete_button.setVisible(False)
        self.edit_button.setVisible(False)

        self.actions_container = QWidget()
        self.actions_container.setObjectName("rowActionsContainer")
        actions_layout = QHBoxLayout()
        actions_layout.setContentsMargins(0, 0, 0, 0)
        actions_layout.setSpacing(12)
        actions_layout.addWidget(self.delete_button)
        actions_layout.addWidget(self.edit_button)
        self.actions_container.setLayout(actions_layout)
        self.actions_container.setFixedWidth(ACTIONS_WIDTH)

        self.delete_button.clicked.connect(lambda: self.delete_requested.emit(self.index))
        self.edit_button.clicked.connect(lambda: self.edit_requested.emit(self.index))
        self.captain_checkbox.toggled.connect(lambda value: self.captain_toggled.emit(self.index, value))
        self.name_field.returnPressed.connect(self._commit)
        self.number_field.returnPressed.connect(self._commit)
        self.name_field.installEventFilter(self)

        layout.addWidget(self.order_label)
        layout.addWidget(self.name_field)
        layout.addWidget(self.number_field)
        layout.addWidget(self.captain_checkbox, 0, Qt.AlignmentFlag.AlignHCenter)
        layout.addWidget(self.actions_container)
        self.setLayout(layout)

        for widget in (self, self.order_label, self.name_field, self.number_field, self.captain_checkbox):
            widget.installEventFilter(self)

    def set_selected(self, selected: bool) -> None:
        self._selected = selected
        self.setProperty("selected", selected)
        self.style().unpolish(self)
        self.style().polish(self)
        self._update_actions_visibility()

    def set_captain_mode_active(self, active: bool) -> None:
        self.setProperty("captainModeActive", active)
        self.style().unpolish(self)
        self.style().polish(self)

    def set_edit_mode(self, enabled: bool) -> None:
        was_editing = self._editing
        self._editing = enabled
        self.setProperty("editing", enabled)
        self.name_field.setReadOnly(not enabled)
        self.number_field.setReadOnly(not enabled)
        self.name_field.setProperty("editingField", enabled)
        self.number_field.setProperty("editingField", enabled)
        self.style().unpolish(self)
        self.style().polish(self)
        self.name_field.style().unpolish(self.name_field)
        self.name_field.style().polish(self.name_field)
        self.number_field.style().unpolish(self.number_field)
        self.number_field.style().polish(self.number_field)
        if enabled and not was_editing:
            self.name_field.setFocus(Qt.FocusReason.OtherFocusReason)
            self.name_field.setCursorPosition(len(self.name_field.text()))
        self._update_actions_visibility()

    def _update_actions_visibility(self) -> None:
        # In edit mode keep focus flow between name and number fields only.
        show_actions = self._selected and self.name_field.isReadOnly() and self.number_field.isReadOnly()
        self.delete_button.setVisible(show_actions)
        self.edit_button.setVisible(show_actions)

    def _commit(self) -> None:
        self.commit_requested.emit(self.index, self.name_field.text(), self.number_field.text())

    def set_number_if_empty(self, value: str) -> None:
        """Fill number field only when it's currently empty."""
        if not self.number_field.text().strip():
            self.number_field.setText(value)

    def mousePressEvent(self, event) -> None:  # noqa: N802
        self.selected.emit(self.index)
        super().mousePressEvent(event)

    def focusInEvent(self, event) -> None:  # noqa: N802
        self.selected.emit(self.index)
        super().focusInEvent(event)

    def eventFilter(self, watched, event) -> bool:  # noqa: ANN001
        if watched in (self.name_field, self.number_field) and event.type() == QEvent.Type.KeyPress:
            if event.key() == Qt.Key.Key_Escape:
                self.cancel_requested.emit(self.index)
                return True
            if event.key() == Qt.Key.Key_Up:
                target_field = "name" if watched is self.name_field else "number"
                self.navigate_requested.emit(self.index, -1, target_field)
                return True
            if event.key() == Qt.Key.Key_Down:
                target_field = "name" if watched is self.name_field else "number"
                self.navigate_requested.emit(self.index, 1, target_field)
                return True
        if watched is self.name_field and event.type() == QEvent.Type.KeyPress:
            if event.key() == Qt.Key.Key_Tab and not self.name_field.isReadOnly():
                self.number_focus_requested.emit(self.index)
                self.number_field.setFocus()
                self.number_field.selectAll()
                return True
        if watched is self.number_field and event.type() == QEvent.Type.FocusIn and not self.number_field.isReadOnly():
            self.number_focus_requested.emit(self.index)
        if event.type() in (QEvent.Type.MouseButtonPress, QEvent.Type.FocusIn):
            self.selected.emit(self.index)
        return super().eventFilter(watched, event)


class MainWindow(QMainWindow):
    """Main app window with participant settings and generated result."""

    def __init__(self) -> None:
        super().__init__()
        self._suspend_settings_save = True
        self.setWindowTitle("Flyer Generators")
        self.setStyleSheet(get_app_stylesheet())

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

        self.participants: list[Participant] = []
        self._last_rounds: list[TeamRound] = []
        self._target_rounds: list[TeamRound] = []

        self._pulse_timer = QTimer(self)
        self._pulse_timer.timeout.connect(self._on_pulse_tick)
        self._pulse_ticks = 0
        self._pulse_total_ticks = config.ANIMATION_STEP_COUNT
        self._animation_step_delay_ms = config.ANIMATION_STEP_DELAY_MS

        self._blink_timer = QTimer(self)
        self._blink_timer.timeout.connect(self._toggle_generating_blink)
        self._blink_visible = True

        self.settings_toggle.clicked.connect(self.on_toggle_settings_clicked)
        self.export_pdf_button.clicked.connect(self.on_export_pdf_clicked)

        self._build_ui()
        self._load_session_settings()
        self._apply_captain_column_visibility()
        self._suspend_settings_save = False
        if self._last_rounds:
            self._render_rounds(self._last_rounds)
        else:
            self._render_empty_scheme()
        self.settings_popup.hide()

    def _build_ui(self) -> None:
        self.title_label = QLabel(config.APP_TITLE_TEXT)
        self.title_label.setObjectName("resultTitle")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.title_label.setCursor(Qt.CursorShape.PointingHandCursor)
        self.title_label.mousePressEvent = self._on_title_clicked

        top_bar = QHBoxLayout()
        top_bar.setContentsMargins(0, 8, 0, 10)
        top_bar.setSpacing(0)

        self.right_controls = QWidget()
        right_layout = QHBoxLayout()
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(10)
        right_layout.addWidget(self.export_pdf_button)
        right_layout.addWidget(self.settings_toggle)
        self.right_controls.setLayout(right_layout)

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

        self.top_separator = QFrame()
        self.top_separator.setObjectName("topSeparator")
        self.top_separator.setFrameShape(QFrame.Shape.HLine)
        outer.addWidget(self.top_separator)
        outer.addLayout(content)

        root.setLayout(outer)
        self.setCentralWidget(root)
        self._build_settings_popup()

    def _build_settings_popup(self) -> None:
        self.settings_popup = QWidget(self)
        self.settings_popup.setObjectName("settingsPopup")
        self.settings_popup.setAutoFillBackground(True)

        layout = QVBoxLayout()
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        rounds_row = QHBoxLayout()
        rounds_row.setContentsMargins(ORDER_WIDTH + ROW_SPACING, 0, 0, 0)
        rounds_label = QLabel("Rounds")
        rounds_label.setObjectName("settingsRoundsLabel")
        self.round_count = QComboBox()
        self.round_count.setObjectName("roundCountBox")
        for value in range(1, config.MAX_ROUND_COUNT + 1):
            self.round_count.addItem(str(value), value)
        default_index = max(0, min(config.MAX_ROUND_COUNT - 1, config.DEFAULT_ROUND_COUNT - 1))
        self.round_count.setCurrentIndex(default_index)
        self.round_count.currentIndexChanged.connect(self._on_rounds_changed)

        team_size_label = QLabel("Team Size")
        team_size_label.setObjectName("settingsRoundsLabel")
        self.team_size = QComboBox()
        self.team_size.setObjectName("roundCountBox")
        for value in range(config.MIN_TEAM_SIZE, config.MAX_TEAM_SIZE + 1):
            self.team_size.addItem(str(value), value)
        team_size_default_idx = self.team_size.findData(config.DEFAULT_TEAM_SIZE)
        self.team_size.setCurrentIndex(team_size_default_idx if team_size_default_idx >= 0 else 0)
        self.team_size.currentIndexChanged.connect(self._on_team_size_changed)
        self.captain_mode_checkbox = QCheckBox("Captain")
        self.captain_mode_checkbox.setObjectName("captainModeCheckbox")
        self.captain_mode_checkbox.setChecked(False)
        self.captain_mode_checkbox.toggled.connect(self._on_captain_mode_changed)

        self.add_button = QPushButton("Add +")
        self.add_button.setObjectName("actionButton")
        self.add_button.clicked.connect(self._on_add_participant)

        rounds_row.addWidget(rounds_label)
        rounds_row.addWidget(self.round_count)
        rounds_row.addSpacing(16)
        rounds_row.addWidget(team_size_label)
        rounds_row.addWidget(self.team_size)
        rounds_row.addSpacing(10)
        rounds_row.addWidget(self.captain_mode_checkbox)
        rounds_row.addStretch(1)
        rounds_row.addWidget(self.add_button)
        layout.addLayout(rounds_row)

        layout.addWidget(self._build_participants_header())

        self.participants_list_container = QWidget()
        self.participants_list_container.setObjectName("participantsListContainer")
        self.participants_list_layout = QVBoxLayout()
        self.participants_list_layout.setContentsMargins(0, 0, 14, 0)
        self.participants_list_layout.setSpacing(2)
        self.participants_list_layout.addStretch(1)
        self.participants_list_container.setLayout(self.participants_list_layout)

        self.participants_scroll = QScrollArea()
        self.participants_scroll.setObjectName("participantsScroll")
        self.participants_scroll.setWidgetResizable(True)
        self.participants_scroll.setWidget(self.participants_list_container)
        layout.addWidget(self.participants_scroll, 1)
        self._active_participant_index: int | None = None
        self._editing_participant_index: int | None = None

        self.settings_popup.setLayout(layout)

    def _build_participants_header(self) -> QWidget:
        """Build participants table header aligned to row grid."""
        header = QWidget()
        self.participants_header_widget = header
        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        row.setSpacing(ROW_SPACING)

        order_spacer = QWidget()
        order_spacer.setFixedWidth(ORDER_WIDTH)

        name_col = QLabel("Name")
        name_col.setObjectName("participantsHeader")
        name_col.setFixedWidth(NAME_WIDTH)
        name_col.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)

        num_col = QLabel("№")
        num_col.setObjectName("participantsHeader")
        num_col.setFixedWidth(NUMBER_WIDTH)
        num_col.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)

        self.captain_col = QLabel("Captain")
        self.captain_col.setObjectName("participantsHeader")
        self.captain_col.setFixedWidth(ACTIONS_CAPTAIN_WIDTH)
        self.captain_col.setAlignment(Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignVCenter)

        actions_spacer = QWidget()
        actions_spacer.setFixedWidth(ACTIONS_WIDTH)

        row.addWidget(order_spacer)
        row.addWidget(name_col)
        row.addWidget(num_col)
        row.addWidget(self.captain_col)
        row.addWidget(actions_spacer)
        header.setLayout(row)
        return header

    def on_toggle_settings_clicked(self) -> None:
        if self.settings_popup.isVisible():
            self.settings_popup.hide()
            return
        self._place_settings_popup()
        self.settings_popup.show()
        self.settings_popup.raise_()

    def _on_title_clicked(self, _event) -> None:
        self.on_generate_clicked()

    def on_generate_clicked(self) -> None:
        if self._pulse_timer.isActive():
            return
        if self.settings_popup.isVisible():
            self.settings_popup.hide()
        if not self._validate_captains_for_mode():
            return

        try:
            rounds = generate_team_rounds(
                round_count=self._round_value(),
                participants=self.participants,
                team_size=self._team_size_value(),
                captain_mode=self._captain_mode_enabled(),
                rng=random.Random(),
            )
        except ValueError as exc:
            self._show_validation_error(str(exc))
            return

        self._last_rounds = rounds
        self._target_rounds = list(rounds)
        self._start_shuffle_pulse()
        self._save_current_settings()

    def _on_add_participant(self) -> None:
        self.participants.append(Participant(number="", full_name=""))
        new_index = len(self.participants) - 1
        self._sync_participants_table(select_index=new_index)
        self._set_editing_participant(new_index)
        self._focus_participant_field(new_index, "name")
        self._scroll_participants_to_index(new_index)

    def _selected_participant_index(self) -> int | None:
        if self._active_participant_index is None:
            return None
        if self._active_participant_index < 0 or self._active_participant_index >= len(self.participants):
            return None
        return self._active_participant_index

    def _on_edit_participant(self) -> None:
        index = self._selected_participant_index()
        if index is None:
            QMessageBox.information(self, "Edit participant", "Select participant first.")
            return
        self._set_editing_participant(index)
        self._focus_participant_field(index, "name")

    def _on_delete_participant(self) -> None:
        index = self._selected_participant_index()
        if index is None:
            QMessageBox.information(self, "Delete participant", "Select participant first.")
            return
        del self.participants[index]
        next_index = index if index < len(self.participants) else len(self.participants) - 1
        self._sync_participants_table(select_index=next_index if next_index >= 0 else None)
        self._save_current_settings()

    def _sync_participants_table(self, select_index: int | None = None) -> None:
        while self.participants_list_layout.count() > 1:
            item = self.participants_list_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

        for idx, participant in enumerate(self.participants):
            row = ParticipantRowWidget(idx, participant)
            row.captain_checkbox.setVisible(self._captain_mode_enabled())
            row.captain_checkbox.setProperty("captainModeActive", self._captain_mode_enabled())
            row.captain_checkbox.style().unpolish(row.captain_checkbox)
            row.captain_checkbox.style().polish(row.captain_checkbox)
            row.set_captain_mode_active(self._captain_mode_enabled())
            row.selected.connect(self._on_participant_row_selected)
            row.edit_requested.connect(self._on_edit_participant_by_index)
            row.delete_requested.connect(self._on_delete_participant_by_index)
            row.commit_requested.connect(self._on_participant_row_commit)
            row.captain_toggled.connect(self._on_participant_captain_toggled)
            row.number_focus_requested.connect(self._on_participant_number_focus_requested)
            row.navigate_requested.connect(self._on_participant_row_navigate_requested)
            row.cancel_requested.connect(self._on_participant_row_cancel_requested)
            self.participants_list_layout.insertWidget(self.participants_list_layout.count() - 1, row)

        target_index = select_index if select_index is not None else self._active_participant_index
        self._set_active_participant(target_index)
        self._apply_row_edit_state()

    def _set_active_participant(self, index: int | None) -> None:
        if index is None or not (0 <= index < len(self.participants)):
            self._active_participant_index = None
        else:
            self._active_participant_index = index

        for pos in range(self.participants_list_layout.count() - 1):
            widget = self.participants_list_layout.itemAt(pos).widget()
            if isinstance(widget, ParticipantRowWidget):
                widget.set_selected(widget.index == self._active_participant_index)

    def _on_participant_row_selected(self, index: int) -> None:
        # Clicking another row while editing should end current edit mode.
        if self._editing_participant_index is not None and self._editing_participant_index != index:
            if self._discard_empty_new_participant(self._editing_participant_index):
                return
            self._editing_participant_index = None
            self._sync_participants_table(select_index=index)
            return
        self._set_active_participant(index)
        self._apply_row_edit_state()

    def _on_edit_participant_by_index(self, index: int) -> None:
        self._set_active_participant(index)
        self._set_editing_participant(index)

    def _on_delete_participant_by_index(self, index: int) -> None:
        self._set_active_participant(index)
        self._on_delete_participant()

    def _on_participant_captain_toggled(self, index: int, value: bool) -> None:
        if index < 0 or index >= len(self.participants):
            return
        item = self.participants[index]
        self.participants[index] = Participant(
            number=item.number,
            full_name=item.full_name,
            is_captain=bool(value),
        )
        self._sync_participants_table(select_index=index)
        self._save_current_settings()

    def _set_editing_participant(self, index: int | None) -> None:
        self._editing_participant_index = index
        self._apply_row_edit_state()

    def _apply_row_edit_state(self) -> None:
        for pos in range(self.participants_list_layout.count() - 1):
            widget = self.participants_list_layout.itemAt(pos).widget()
            if isinstance(widget, ParticipantRowWidget):
                widget.set_edit_mode(widget.index == self._editing_participant_index)

    def _on_participant_row_commit(self, index: int, full_name: str, number: str) -> None:
        if index < 0 or index >= len(self.participants):
            return

        was_new_placeholder = (
            self.participants[index].full_name.strip() == ""
            and self.participants[index].number.strip() == ""
        )
        clean_name = full_name.strip()
        clean_number = number.strip()
        existing_numbers = {item.number for idx, item in enumerate(self.participants) if idx != index and item.number}
        try:
            validate_participant(clean_number, clean_name, existing_numbers)
        except ValueError as exc:
            self._show_validation_error(str(exc))
            self._set_active_participant(index)
            self._set_editing_participant(index)
            return

        self.participants[index] = Participant(
            number=clean_number,
            full_name=clean_name,
            is_captain=self.participants[index].is_captain,
        )
        self._editing_participant_index = None
        self._sync_participants_table(select_index=index)
        self._save_current_settings()
        if was_new_placeholder:
            self._on_add_participant()

    def _focus_participant_field(self, index: int, field: str, select_text: bool = True) -> None:
        for pos in range(self.participants_list_layout.count() - 1):
            widget = self.participants_list_layout.itemAt(pos).widget()
            if isinstance(widget, ParticipantRowWidget) and widget.index == index:
                if field == "number":
                    widget.number_field.setFocus()
                    if select_text:
                        widget.number_field.selectAll()
                    else:
                        widget.number_field.deselect()
                        widget.number_field.setCursorPosition(len(widget.number_field.text()))
                else:
                    widget.name_field.setFocus()
                    if select_text:
                        widget.name_field.selectAll()
                    else:
                        widget.name_field.deselect()
                        widget.name_field.setCursorPosition(len(widget.name_field.text()))
                break

    def _scroll_participants_to_index(self, index: int) -> None:
        """Ensure participant row is visible inside scroll area."""
        def _apply_scroll() -> None:
            target: ParticipantRowWidget | None = None
            for pos in range(self.participants_list_layout.count() - 1):
                widget = self.participants_list_layout.itemAt(pos).widget()
                if isinstance(widget, ParticipantRowWidget) and widget.index == index:
                    target = widget
                    break
            if target is not None:
                self.participants_scroll.ensureWidgetVisible(target, 0, 16)

        # Run after layout pass; second attempt helps on slower redraws.
        QTimer.singleShot(0, _apply_scroll)
        QTimer.singleShot(16, _apply_scroll)

    def _on_participant_number_focus_requested(self, index: int) -> None:
        """Auto-fill number for new row from previous participant on number focus."""
        if index < 1:
            return
        previous = self.participants[index - 1].number.strip()
        if len(previous) != 3 or not previous.isdigit():
            return
        next_value = min(int(previous) + 1, 999)
        suggested = f"{next_value:03d}"
        for pos in range(self.participants_list_layout.count() - 1):
            widget = self.participants_list_layout.itemAt(pos).widget()
            if isinstance(widget, ParticipantRowWidget) and widget.index == index:
                widget.set_number_if_empty(suggested)
                break

    def _on_participant_row_navigate_requested(self, index: int, direction: int, field: str) -> None:
        target = index + direction
        if target < 0 or target >= len(self.participants):
            return
        if self._editing_participant_index is not None and self._editing_participant_index != target:
            self._editing_participant_index = None
            self._sync_participants_table(select_index=target)
        else:
            self._set_active_participant(target)
            self._apply_row_edit_state()
        self._focus_participant_field(target, field, select_text=False)

    def _on_participant_row_cancel_requested(self, index: int) -> None:
        """Handle Esc for participant row editing."""
        if self._discard_empty_new_participant(index):
            return
        self._editing_participant_index = None
        self._active_participant_index = None
        self._sync_participants_table(select_index=None)

    def _discard_empty_new_participant(self, index: int) -> bool:
        """Delete new placeholder row (empty name) and focus last row."""
        if index < 0 or index >= len(self.participants):
            return False
        if self.participants[index].full_name.strip():
            return False

        del self.participants[index]
        self._editing_participant_index = None
        last_index = len(self.participants) - 1
        self._sync_participants_table(select_index=last_index if last_index >= 0 else None)
        self._save_current_settings()
        return True

    def _clear_results(self) -> None:
        while self.result_layout.count() > 1:
            item = self.result_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

    def _render_rounds(self, rounds: list[TeamRound]) -> None:
        self._clear_results()
        for round_item in rounds:
            self._append_round_widget(round_item)

    def _append_round_widget(self, round_item: TeamRound) -> None:
        round_label = QLabel(f"Round {round_item.number}")
        round_label.setObjectName("roundLabel")
        round_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.result_layout.insertWidget(self.result_layout.count() - 1, round_label)

        row = QWidget()
        row_layout = QGridLayout()
        row_layout.setHorizontalSpacing(22)
        row_layout.setVerticalSpacing(10)
        row_layout.setContentsMargins(0, 0, 0, 0)
        teams_count = max(1, len(round_item.teams))
        teams_per_row = 4 if teams_count > 5 else teams_count
        rendered_columns = min(teams_per_row, teams_count)
        viewport_width = self.result_scroll.viewport().width() if self.result_scroll is not None else self.width()
        horizontal_spacing = row_layout.horizontalSpacing()
        available_width = max(240, viewport_width - (horizontal_spacing * (rendered_columns - 1)))
        column_width = max(120, available_width // rendered_columns)
        card_width = max(110, int(column_width * 0.86))
        for idx in range(rendered_columns):
            row_layout.setColumnStretch(idx, 1)

        teams_to_render = round_item.teams if round_item.teams else [[]]
        for idx, team in enumerate(teams_to_render):
            team_column = QWidget()
            team_layout = QVBoxLayout()
            team_layout.setContentsMargins(0, 0, 0, 0)
            team_layout.setSpacing(8)

            team_title = QLabel(f"Team {idx + 1}")
            team_title.setObjectName("teamColumnHeader")
            team_title.setFixedWidth(card_width)
            team_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
            team_layout.addWidget(team_title, 0, Qt.AlignmentFlag.AlignHCenter)

            if not team:
                empty_card = QLabel("")
                empty_card.setObjectName("resultCard")
                empty_card.setFixedHeight(PARTICIPANT_CARD_HEIGHT)
                empty_card.setFixedWidth(card_width)
                empty_card.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
                team_layout.addWidget(empty_card, 0, Qt.AlignmentFlag.AlignHCenter)
            else:
                for participant in team:
                    participant_text = format_participant(participant)
                    participant_card = QLabel(participant_text)
                    participant_card.setObjectName("resultCard")
                    participant_card.setProperty("captain", participant.is_captain and self._captain_mode_enabled())
                    participant_card.setFixedHeight(PARTICIPANT_CARD_HEIGHT)
                    participant_card.setFixedWidth(card_width)
                    participant_card.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)
                    participant_card.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
                    participant_card.setWordWrap(False)
                    self._fit_result_card_text(participant_card, participant_text)
                    team_layout.addWidget(participant_card, 0, Qt.AlignmentFlag.AlignHCenter)

            team_layout.addStretch(1)
            team_column.setLayout(team_layout)
            row_layout.addWidget(team_column, idx // teams_per_row, idx % teams_per_row)

        row.setLayout(row_layout)
        self.result_layout.insertWidget(self.result_layout.count() - 1, row)

    def _fit_result_card_text(self, label: QLabel, text: str) -> None:
        """Shrink card text size to keep it on one line without wrapping."""

        def _apply() -> None:
            if not isValid(label):
                return
            # Account for left/right inner padding from stylesheet.
            available_width = max(20, label.contentsRect().width() - 24)
            available_height = max(14, label.contentsRect().height() - 10)
            if available_width <= 20:
                return

            min_size = 8
            max_size = 48
            chosen = min_size
            for size in range(max_size, min_size - 1, -1):
                font = QFont(label.font())
                font.setPointSize(size)
                metrics = QFontMetrics(font)
                if metrics.horizontalAdvance(text) <= available_width and metrics.height() <= available_height:
                    chosen = size
                    break

            font = QFont(label.font())
            font.setPointSize(chosen)
            label.setFont(font)

        QTimer.singleShot(0, _apply)
        QTimer.singleShot(16, _apply)

    def _render_empty_scheme(self) -> None:
        self._clear_results()
        for number in range(1, self._round_value() + 1):
            round_item = TeamRound(number=number, teams=[[]])
            self._append_round_widget(round_item)

    def _start_shuffle_pulse(self) -> None:
        self._clear_results()
        self._pulse_ticks = 0
        self.right_controls.setVisible(False)
        self.title_label.setText("Generating...")
        self._blink_visible = True
        self._blink_timer.start(300)
        self._pulse_timer.start(self._animation_step_delay_ms)

    def _on_pulse_tick(self) -> None:
        if self._pulse_ticks >= self._pulse_total_ticks:
            self._pulse_timer.stop()
            self._blink_timer.stop()
            self.title_label.setText(config.APP_TITLE_TEXT)
            self.title_label.setStyleSheet("color: #ffffff;")
            self.right_controls.setVisible(True)
            self._render_rounds(self._target_rounds)
            return

        self._pulse_ticks += 1
        self._render_pulse_frame()

    def _render_pulse_frame(self) -> None:
        self._clear_results()
        if len(self.participants) < 2:
            return
        if not self._validate_captains_for_mode(show_message=False):
            return
        fake_rounds = generate_team_rounds(
            self._round_value(),
            self.participants,
            self._team_size_value(),
            captain_mode=self._captain_mode_enabled(),
            rng=random.Random(),
        )
        self._render_rounds(fake_rounds)

    def _toggle_generating_blink(self) -> None:
        self._blink_visible = not self._blink_visible
        self.title_label.setStyleSheet("color: #ffffff;" if self._blink_visible else "color: #7f7f7f;")

    def _round_value(self) -> int:
        value = self.round_count.currentData()
        return int(value) if value is not None else 1

    def _team_size_value(self) -> int:
        value = self.team_size.currentData()
        return int(value) if value is not None else config.DEFAULT_TEAM_SIZE

    def _captain_mode_enabled(self) -> bool:
        return bool(self.captain_mode_checkbox.isChecked())

    def _team_count(self) -> int:
        team_size = max(1, self._team_size_value())
        return (len(self.participants) + team_size - 1) // team_size

    def _captains_count(self) -> int:
        return sum(1 for item in self.participants if item.is_captain)

    def _validate_captains_for_mode(self, show_message: bool = True) -> bool:
        if not self._captain_mode_enabled():
            return True
        teams_count = self._team_count()
        captains_count = self._captains_count()
        if captains_count > teams_count:
            if show_message:
                self._show_validation_error("Количество капитанов не должно быть больше количества команд.")
            return False
        if captains_count != teams_count:
            if show_message:
                self._show_validation_error("В режиме Captain нужно выбрать капитана для каждой команды.")
            return False
        return True

    def _save_current_settings(self) -> None:
        if self._suspend_settings_save:
            return
        save_settings(
            {
                "round_count": self._round_value(),
                "team_size": self._team_size_value(),
                "captain_mode": self._captain_mode_enabled(),
                "animation_step_delay_ms": self._animation_step_delay_ms,
                "animation_step_count": self._pulse_total_ticks,
                "participants": [
                    {
                        "number": item.number,
                        "full_name": item.full_name,
                        "is_captain": item.is_captain,
                    }
                    for item in self.participants
                ],
                "last_generated": self._serialize_rounds(self._last_rounds),
            }
        )

    def _load_session_settings(self) -> None:
        settings = load_settings()
        if not settings:
            return

        round_count = settings.get("round_count")
        if isinstance(round_count, int):
            idx = self.round_count.findData(max(1, min(config.MAX_ROUND_COUNT, round_count)))
            if idx >= 0:
                self.round_count.setCurrentIndex(idx)

        team_size = settings.get("team_size")
        if isinstance(team_size, int):
            idx = self.team_size.findData(max(config.MIN_TEAM_SIZE, min(config.MAX_TEAM_SIZE, team_size)))
            if idx >= 0:
                self.team_size.setCurrentIndex(idx)

        captain_mode = settings.get("captain_mode")
        if isinstance(captain_mode, bool):
            self.captain_mode_checkbox.setChecked(captain_mode)

        animation_step_delay_ms = settings.get("animation_step_delay_ms")
        if isinstance(animation_step_delay_ms, int) and animation_step_delay_ms > 0:
            self._animation_step_delay_ms = animation_step_delay_ms

        animation_step_count = settings.get("animation_step_count")
        if isinstance(animation_step_count, int) and animation_step_count > 0:
            self._pulse_total_ticks = animation_step_count

        participants = settings.get("participants")
        if isinstance(participants, list):
            loaded: list[Participant] = []
            seen: set[str] = set()
            for item in participants:
                if not isinstance(item, dict):
                    continue
                number = item.get("number")
                full_name = item.get("full_name")
                is_captain = item.get("is_captain", False)
                if not isinstance(number, str) or not isinstance(full_name, str):
                    continue
                try:
                    validate_participant(number.strip(), full_name, seen)
                except ValueError:
                    continue
                seen.add(number.strip())
                loaded.append(
                    Participant(
                        number=number.strip(),
                        full_name=full_name.strip(),
                        is_captain=bool(is_captain),
                    )
                )
            self.participants = loaded
            self._sync_participants_table()

        last_generated = settings.get("last_generated")
        if isinstance(last_generated, list):
            self._last_rounds = self._deserialize_rounds(last_generated)

    def _serialize_rounds(self, rounds: list[TeamRound]) -> list[dict]:
        return [
            {
                "number": item.number,
                "teams": [
                    [
                        {
                            "number": p.number,
                            "full_name": p.full_name,
                            "is_captain": p.is_captain,
                        }
                        for p in team
                    ]
                    for team in item.teams
                ],
            }
            for item in rounds
        ]

    def _deserialize_rounds(self, payload: list[dict]) -> list[TeamRound]:
        result: list[TeamRound] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            number = item.get("number")
            teams = self._deserialize_teams(item.get("teams"))
            if not teams:
                # Backward compatibility with older payload format.
                team_a = self._deserialize_team(item.get("team_a"))
                team_b = self._deserialize_team(item.get("team_b"))
                teams = [team_a, team_b]
            if isinstance(number, int):
                result.append(TeamRound(number=number, teams=teams))
        return result

    def _deserialize_team(self, payload: object) -> list[Participant]:
        if not isinstance(payload, list):
            return []
        team: list[Participant] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            number = item.get("number")
            full_name = item.get("full_name")
            is_captain = item.get("is_captain", False)
            if isinstance(number, str) and isinstance(full_name, str):
                team.append(Participant(number=number, full_name=full_name, is_captain=bool(is_captain)))
        return team

    def _deserialize_teams(self, payload: object) -> list[list[Participant]]:
        if not isinstance(payload, list):
            return []
        return [self._deserialize_team(team_payload) for team_payload in payload]

    def resizeEvent(self, event) -> None:  # noqa: N802
        super().resizeEvent(event)
        if self._last_rounds:
            self._render_rounds(self._last_rounds)
        elif hasattr(self, "round_count"):
            self._render_empty_scheme()
        if self.settings_popup.isVisible():
            self._place_settings_popup()

    def keyPressEvent(self, event) -> None:  # noqa: N802
        if (
            event.key() == Qt.Key.Key_Escape
            and self.settings_popup.isVisible()
            and self._editing_participant_index is None
        ):
            self.settings_popup.hide()
            event.accept()
            return
        super().keyPressEvent(event)

    def _settings_popup_size(self) -> tuple[int, int]:
        margin = 12
        available_width = max(360, self.width() - (margin * 2))
        min_y = self._settings_popup_min_y()
        available_height = max(220, self.height() - min_y - margin)
        return (min(1040, available_width), available_height)

    def _settings_popup_min_y(self) -> int:
        line_bottom = self.top_separator.geometry().bottom()
        return line_bottom + 2

    def _place_settings_popup(self) -> None:
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

    def _on_rounds_changed(self) -> None:
        if not self._pulse_timer.isActive() and not self._last_rounds:
            self._render_empty_scheme()
        self._save_current_settings()

    def _on_team_size_changed(self) -> None:
        if not self._pulse_timer.isActive() and not self._last_rounds:
            self._render_empty_scheme()
        self._save_current_settings()

    def _on_captain_mode_changed(self) -> None:
        self._apply_captain_column_visibility()
        self._sync_participants_table(select_index=self._active_participant_index)
        if not self._pulse_timer.isActive() and not self._last_rounds:
            self._render_empty_scheme()
        self._save_current_settings()

    def _apply_captain_column_visibility(self) -> None:
        visible = self._captain_mode_enabled()
        if hasattr(self, "captain_col"):
            self.captain_col.setVisible(visible)

    def _show_validation_error(self, message: str) -> None:
        """Show localized validation error dialog with dark text."""
        box = QMessageBox(self)
        box.setIcon(QMessageBox.Icon.Warning)
        box.setWindowTitle("Ошибка валидации")
        box.setText(message)
        box.setStandardButtons(QMessageBox.StandardButton.Ok)
        box.setStyleSheet("QLabel { color: #000000; }")
        box.exec()

    def on_export_pdf_clicked(self) -> None:
        if not self._last_rounds:
            QMessageBox.information(self, "Export PDF", "No generated rounds to export yet.")
            return

        default_name = f"flyer_generators_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        file_path, _ = QFileDialog.getSaveFileName(self, "Save PDF", default_name, "PDF Files (*.pdf)")
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
            page_layout.setOrientation(QPageLayout.Orientation.Portrait)
            page_layout.setMargins(QMarginsF(12.7, 12.7, 12.7, 12.7))
            printer.setPageLayout(page_layout)

            document = QTextDocument()
            document.setDocumentMargin(0)
            document.setDefaultStyleSheet("body { font-family: Arial; margin: 0; padding: 0; }")
            document.setHtml(self._build_pdf_html())
            document.setPageSize(printer.pageRect(QPrinter.Unit.Point).size())
            document.print_(printer)
        except Exception as exc:  # pragma: no cover
            QMessageBox.warning(self, "Export PDF", f"Failed to export PDF:\n{exc}")
            return

        QMessageBox.information(self, "Export PDF", "PDF exported successfully.")

    def _build_pdf_html(self) -> str:
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return (
            f"<h1 style='font-size:24pt;margin:0 0 6px 0;'>{escape(config.APP_TITLE_TEXT)}</h1>"
            f"<p style='font-size:10pt;margin:0 0 8px 0;'>Generated: {generated_at}</p>"
            f"{self._build_rounds_table_html(self._last_rounds)}"
        )

    def _build_rounds_table_html(self, rounds: list[TeamRound]) -> str:
        round_count = max(1, len(rounds))
        max_teams = max((len(round_item.teams) for round_item in rounds), default=1)
        header_cells = "".join(
            f"<th style='border:1px solid #555;padding:5px;background:#efefef;'>Round {escape(str(item.number))}</th>"
            for item in rounds
        )
        rows = []
        for team_idx in range(max_teams):
            round_cells = []
            for round_item in rounds:
                team = round_item.teams[team_idx] if team_idx < len(round_item.teams) else []
                participants_text = "<br/>".join(escape(format_participant(p)) for p in team)
                round_cells.append(f"<td style='border:1px solid #555;padding:5px;'>{participants_text}</td>")
            rows.append(
                "<tr>"
                f"<td style='border:1px solid #555;padding:5px;background:#efefef;font-weight:700;'>Team {team_idx + 1}</td>"
                f"{''.join(round_cells)}"
                "</tr>"
            )
        round_col_width = int(82 / round_count)
        extra = 82 - (round_col_width * round_count)
        colgroup = "<col style='width:18%;'/>" + "".join(
            f"<col style='width:{round_col_width + (1 if idx < extra else 0)}%;'/>"
            for idx in range(round_count)
        )
        return (
            "<table style='width:100%;border-collapse:collapse;table-layout:fixed;'>"
            f"<colgroup>{colgroup}</colgroup>"
            "<thead><tr>"
            "<th style='border:1px solid #555;padding:5px;background:#efefef;'>Team</th>"
            f"{header_cells}"
            "</tr></thead>"
            f"<tbody>{''.join(rows)}</tbody>"
            "</table>"
        )
