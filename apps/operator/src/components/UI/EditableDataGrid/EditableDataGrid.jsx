import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import {
  DataGrid,
  GridActionsCellItem,
  GridRowEditStopReasons,
  GridRowModes,
  GridToolbarContainer,
  useGridApiRef,
} from "@mui/x-data-grid";
import hasDuplicates from "../../../utils/hasDuplicates";

function getNextTeamNumber(rows) {
  const maxNumber = rows.reduce((max, row) => {
    const value = Number(row?.number);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 100);

  return String(maxNumber + 1);
}

function createDraftRow(tableHeader, rows) {
  return {
    id: `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    number: tableHeader === "Teams" ? getNextTeamNumber(rows) : "",
    battle: "No",
    isNew: true,
  };
}

function TeamNameEditCell({ id, value, row, apiRef, queueNextDraftAfterCommit, discardDraftRow }) {
  const inputRef = React.useRef(null);
  const [localValue, setLocalValue] = React.useState(String(value ?? ""));

  React.useEffect(() => {
    setLocalValue(String(value ?? ""));
  }, [value]);

  React.useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const handleChange = async (event) => {
    const nextValue = event.target.value;
    setLocalValue(nextValue);
    await apiRef.current.setEditCellValue({ id, field: "name", value: nextValue }, event);
  };

  const handleKeyDown = async (event) => {
    const trimmedValue = String(localValue || "").trim();

    if (event.key === "Escape") {
      if (row?.isNew && trimmedValue.length === 0) {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent?.stopImmediatePropagation?.();
        apiRef.current.stopRowEditMode({ id, ignoreModifications: true });
        window.requestAnimationFrame(() => {
          discardDraftRow(id);
        });
        return;
      }

      event.stopPropagation();
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (trimmedValue.length === 0) {
      return;
    }

    setLocalValue(trimmedValue);
    await apiRef.current.setEditCellValue({ id, field: "name", value: trimmedValue }, event);
    queueNextDraftAfterCommit(id);
    apiRef.current.stopRowEditMode({ id });
  };

  return (
    <input
      ref={inputRef}
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        color: "#f5f7ff",
        fontSize: "16px",
        fontFamily: "Manrope, Inter, sans-serif",
      }}
    />
  );
}

TeamNameEditCell.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  row: PropTypes.object.isRequired,
  apiRef: PropTypes.object.isRequired,
  queueNextDraftAfterCommit: PropTypes.func.isRequired,
  discardDraftRow: PropTypes.func.isRequired,
};

function EditToolbar(props) {
  const { addDraftRow } = props;

  return (
    <GridToolbarContainer sx={{ justifyContent: "end" }}>
      <Button
        variant="text"
        onClick={addDraftRow}
        sx={{
          minWidth: "0 !important",
          minHeight: "0 !important",
          padding: "10px 20px !important",
          borderRadius: "8px",
          backgroundColor: "transparent",
          color: "#7f8fff !important",
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          "&:hover": {
            backgroundColor: "rgba(90, 103, 255, 0.12)",
          },
          "&:focus, &:focus-visible, &:active": {
            outline: "none",
            boxShadow: "none",
            backgroundColor: "rgba(90, 103, 255, 0.12)",
          },
        }}
      >
        + Add
      </Button>
    </GridToolbarContainer>
  );
}

EditToolbar.propTypes = {
  addDraftRow: PropTypes.func.isRequired,
};

export default function EditableDataGrid(props) {
  const [rows, setRows] = React.useState(props.data);
  const [rowModesModel, setRowModesModel] = React.useState({});
  const { tableHeader, toggleRowsValid, setChangesMade, setIsModified } = props;
  const isPageMode = props.pageMode === true;
  const isTeamsTable = tableHeader === "Teams";
  const apiRef = useGridApiRef();
  const pendingFocusRowIdRef = React.useRef(null);
  const pendingAddAfterCommitRowIdRef = React.useRef(null);

  const queueNextDraftAfterCommit = React.useCallback((rowId) => {
    pendingAddAfterCommitRowIdRef.current = rowId;
  }, []);

  React.useEffect(() => {
    setRows((prev) => {
      const draftRows = prev.filter((row) => row?.isNew);
      if (draftRows.length === 0) {
        return props.data;
      }

      const persistedIds = new Set(props.data.map((row) => String(row?.id)));
      const remainingDraftRows = draftRows.filter((row) => !persistedIds.has(String(row?.id)));
      return [...props.data, ...remainingDraftRows];
    });
  }, [props.data]);

  React.useEffect(() => {
    if (!pendingFocusRowIdRef.current) return undefined;

    const rowId = pendingFocusRowIdRef.current;

    setRowModesModel((prev) => {
      if (prev[rowId]?.mode === GridRowModes.Edit) {
        return prev;
      }

      return {
        ...prev,
        [rowId]: { mode: GridRowModes.Edit, fieldToFocus: "name" },
      };
    });

    let timeoutId;
    const rafId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        if (!apiRef.current?.getRow?.(rowId)) return;
        const cellInput = document.querySelector(
          `[data-id="${CSS.escape(String(rowId))}"][data-field="name"] input`
        );

        if (cellInput instanceof HTMLInputElement) {
          cellInput.focus();
          cellInput.select();
        } else {
          apiRef.current.setCellFocus(rowId, "name");
        }

        pendingFocusRowIdRef.current = null;
      }, 30);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [apiRef, rows]);

  React.useEffect(() => {
    if (tableHeader === "Teams") {
      const namesValid = rows.every((row) => String(row?.name || "").trim().length > 0);
      const numbersValid = rows.every((row) => String(row?.number || "").trim().length > 0);
      const duplicateNumbers = hasDuplicates(rows.map((row) => String(row?.number || "").trim()));
      toggleRowsValid(Boolean(rows.length > 0 && namesValid && numbersValid && !duplicateNumbers));
      return;
    }

    if (tableHeader === "Stages") {
      const namesValid = rows.every((row) => String(row?.name || "").trim().length > 0);
      toggleRowsValid(Boolean(rows.length > 0 && namesValid));
    }
  }, [rows, tableHeader, toggleRowsValid]);

  const discardDraftRow = React.useCallback(
    (rowId) => {
      if (pendingFocusRowIdRef.current === rowId) {
        pendingFocusRowIdRef.current = null;
      }
      setRows((prev) => prev.filter((item) => String(item.id) !== String(rowId)));
      setRowModesModel((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      pendingAddAfterCommitRowIdRef.current = null;
      setChangesMade(true);
      setIsModified(true);
    },
    [setChangesMade, setIsModified]
  );

  const handleDeleteClick = (row) => () => {
    setRows((prev) => prev.filter((item) => item.id !== row.id));
    setRowModesModel((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });
    props.deleteItem(row);
    setChangesMade(true);
    setIsModified(true);
  };

  const addDraftRow = React.useCallback(() => {
    let draftRow;

    setRows((oldRows) => {
      draftRow = createDraftRow(tableHeader, oldRows);
      return [...oldRows, draftRow];
    });

    if (draftRow) {
      pendingFocusRowIdRef.current = draftRow.id;
      setRowModesModel((prev) => ({
        ...prev,
        [draftRow.id]: { mode: GridRowModes.Edit, fieldToFocus: "name" },
      }));
    }

    setIsModified(true);
    setChangesMade(true);
  }, [setChangesMade, setIsModified, tableHeader]);

  const processRowUpdate = (newRow) => {
    const updatedRow = {
      ...newRow,
      name: String(newRow?.name || "").trim(),
      number: tableHeader === "Teams" ? String(newRow?.number || "").trim() : newRow?.number,
      battle: newRow?.battle || "No",
      isNew: false,
      isEdited: true,
    };
    const nextRows = rows.map((row) => (row.id === updatedRow.id ? updatedRow : row));
    const shouldAppendDraft =
      isTeamsTable &&
      pendingAddAfterCommitRowIdRef.current === updatedRow.id &&
      updatedRow.name.length > 0;
    const nextDraftRow = shouldAppendDraft ? createDraftRow(tableHeader, nextRows) : null;

    setRows(nextDraftRow ? [...nextRows, nextDraftRow] : nextRows);

    if (nextDraftRow) {
      pendingFocusRowIdRef.current = nextDraftRow.id;
      setRowModesModel((prev) => ({
        ...prev,
        [updatedRow.id]: { mode: GridRowModes.View },
        [nextDraftRow.id]: { mode: GridRowModes.Edit, fieldToFocus: "name" },
      }));
    }

    pendingAddAfterCommitRowIdRef.current = null;
    props.updateItem(updatedRow);
    setIsModified(true);
    setChangesMade(true);
    return updatedRow;
  };

  const columns = [
    {
      field: "counter",
      headerName: "#",
      sortable: false,
      maxWidth: 60,
      flex: 1,
      editable: false,
    },
    {
      field: "name",
      headerName: "Name",
      editable: true,
      sortable: false,
      flex: 4,
      preProcessEditCellProps: (params) => {
        const value = String(params.props?.value || "").trim();
        return {
          ...params.props,
          error: value.length === 0,
        };
      },
      renderEditCell: isTeamsTable
        ? (params) => (
            <TeamNameEditCell
              {...params}
              apiRef={apiRef}
              queueNextDraftAfterCommit={queueNextDraftAfterCommit}
              discardDraftRow={discardDraftRow}
            />
          )
        : undefined,
    },
    {
      field: "battle",
      headerName: "Battle",
      headerAlign: "center",
      align: "center",
      type: "singleSelect",
      valueOptions: ["Yes", "No"],
      sortable: false,
      editable: true,
      maxWidth: 100,
      flex: 1,
    },
    {
      field: "number",
      headerName: "Number",
      headerAlign: "center",
      align: "center",
      type: "string",
      sortable: false,
      editable: true,
      maxWidth: 100,
      flex: 0.6,
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "actions",
      headerAlign: "center",
      align: "center",
      sortable: false,
      maxWidth: 120,
      flex: 0.7,
      cellClassName: "actions",
      getActions: (row) => [
        <GridActionsCellItem
          key={`delete-${row.id}`}
          icon={<DeleteIcon color="error" />}
          label="Delete"
          className="textPrimary"
          onClick={handleDeleteClick(row)}
          color="inherit"
        />,
      ],
    },
  ];

  const effectiveColumns =
    tableHeader === "Teams"
      ? columns
          .filter((col) => col.field !== "battle")
          .map((col) =>
            col.field === "name"
              ? {
                  ...col,
                  minWidth: 240,
                  flex: 5.2,
                }
              : col.field === "number"
                ? {
                    ...col,
                    minWidth: 108,
                    maxWidth: 118,
                    flex: 0.9,
                  }
                : col.field === "actions"
                  ? {
                      ...col,
                      minWidth: 108,
                      maxWidth: 118,
                      flex: 0.9,
                    }
                  : col
          )
      : columns
          .filter((col) => col.field !== "number")
          .map((col) =>
            col.field === "name"
              ? {
                  ...col,
                  minWidth: 240,
                  flex: 5.2,
                }
              : col.field === "battle"
                ? {
                    ...col,
                    minWidth: 108,
                    maxWidth: 118,
                    flex: 0.9,
                  }
                : col.field === "actions"
                  ? {
                      ...col,
                      minWidth: 108,
                      maxWidth: 118,
                      flex: 0.9,
                    }
                  : col
          );

  const suppressNativeTitle = React.useCallback((event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const titled = target.closest("[title]");
    if (titled instanceof HTMLElement) {
      titled.removeAttribute("title");
    }

    target.querySelectorAll?.("[title]").forEach((el) => {
      if (el instanceof HTMLElement) {
        el.removeAttribute("title");
      }
    });
  }, []);

  return (
    <Box
      sx={{
        "--DataGrid-t-header-background-base": "#141c2d",
        "--DataGrid-bg": "#050b1a",
        "--DataGrid-containerBackground": "#141c2d",
        height: props.gridHeight || 350,
        padding: isPageMode ? "0" : "15px",
        border: isPageMode ? "none" : "1px solid #28324a",
        borderRadius: isPageMode ? "0" : "16px",
        backgroundColor: isPageMode ? "transparent" : "#050b1a",
        width: "100%",
        "& .actions": {
          color: "text.secondary",
        },
        "& .textPrimary": {
          color: "text.primary",
        },
        "& .MuiDataGrid-main": {
          backgroundColor: `${isPageMode ? "transparent" : "#050b1a"} !important`,
          overflow: "hidden",
        },
        "& .MuiDataGrid-virtualScroller": {
          backgroundColor: `${isPageMode ? "transparent" : "#050b1a"} !important`,
          marginTop: "0 !important",
        },
        "& .MuiDataGrid-filler": {
          backgroundColor: `${isPageMode ? "transparent" : "#050b1a"} !important`,
        },
        "& .MuiDataGrid-row": {
          backgroundColor: `${isPageMode ? "rgba(255, 255, 255, 0.01)" : "#050b1a"} !important`,
        },
        "& .MuiDataGrid-footerContainer": {
          backgroundColor: `${isPageMode ? "transparent" : "#050b1a"} !important`,
          borderTop: "1px solid #242d44 !important",
        },
        "& .MuiDataGrid-toolbarContainer": {
          backgroundColor: "transparent !important",
        },
        "& .MuiDataGrid-columnHeaders": {
          position: "relative",
          zIndex: 2,
          backgroundColor: "#141c2d !important",
          borderBottom: "1px solid #2b3551 !important",
        },
        "& .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-columnHeaderTitleContainerContent": {
          backgroundColor: "#141c2d !important",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          color: "#dbe3ff !important",
          fontFamily: "\"Sora\", Inter, sans-serif",
          fontWeight: 700,
          fontSize: "16px",
        },
        "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
          outline: "none !important",
        },
        "& .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaders *": {
          pointerEvents: "none !important",
          cursor: "default !important",
        },
        "& .MuiDataGrid-cell--editing": {
          backgroundColor: "#050b1a !important",
          boxShadow: "none !important",
        },
        "& .MuiDataGrid-cell--editing input": {
          color: "#f5f7ff !important",
        },
        "& .MuiDataGrid-overlay": {
          backgroundColor: "transparent !important",
        },
        "& .MuiDataGrid-overlayWrapper": {
          backgroundColor: "transparent !important",
        },
        "& .MuiDataGrid-cell": {
          color: "#edf2ff !important",
          fontSize: "16px !important",
          borderColor: "rgba(255, 255, 255, 0.05) !important",
        },
        "& .MuiDataGrid-actionsCell .MuiButtonBase-root": {
          minWidth: "0 !important",
          minHeight: "0 !important",
          width: "24px !important",
          height: "24px !important",
          padding: "0 !important",
          borderRadius: "4px !important",
        },
        "& .MuiDataGrid-actionsCell .MuiButtonBase-root:hover": {
          backgroundColor: "rgba(255, 71, 71, 0.12)",
        },
      }}
    >
      <DataGrid
        apiRef={apiRef}
        rows={rows.map((item, index) => ({
          ...item,
          counter: index + 1,
        }))}
        columns={effectiveColumns}
        disableColumnFilter
        disableColumnMenu
        disableColumnSelector
        disableColumnSorting
        disableColumnReorder
        disableColumnResize
        hideFooterPagination
        hideFooterSelectedRowCount
        editMode="row"
        processRowUpdate={processRowUpdate}
        rowModesModel={rowModesModel}
        onRowModesModelChange={setRowModesModel}
        slots={{
          footer: EditToolbar,
        }}
        slotProps={{
          footer: {
            addDraftRow,
          },
        }}
        onProcessRowUpdateError={() => null}
        onRowEditStop={(params, event) => {
          if (isTeamsTable && params.reason === GridRowEditStopReasons.escapeKeyDown) {
            const row = rows.find((item) => String(item.id) === String(params.id));
            if (row?.isNew && String(row?.name || "").trim().length === 0) {
              event.defaultMuiPrevented = true;
              discardDraftRow(params.id);
              return;
            }
          }

          setChangesMade(true);
          setIsModified(true);
        }}
        onMouseOverCapture={suppressNativeTitle}
        isCellEditable={(params) => params.field !== "battle" || !params.row.inDB}
      />
    </Box>
  );
}
