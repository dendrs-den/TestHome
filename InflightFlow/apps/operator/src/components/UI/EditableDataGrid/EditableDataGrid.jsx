import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import { GridToolbarContainer, GridActionsCellItem } from "@mui/x-data-grid";

import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { useEffect } from "react";
import hasDuplicates from "../../../utils/hasDuplicates";

function EditToolbar(props) {
  const { setRows, setIsModified, setChangesMade, tableHeader, requestFocusRow } = props;
  const makeId = () => `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const handleClick = () => {
    const id = tableHeader === "Teams" ? makeId() : String(Math.random() * 10);

    setRows((oldRows) => [...oldRows, { id, name: "", isNew: true, battle: "No", number: "" }]);
    requestFocusRow(id, "name");
    setIsModified(true);
    setChangesMade(true);
  };

  return (
    <GridToolbarContainer sx={{ justifyContent: "end" }}>
      <Button
        variant="text"
        onClick={handleClick}
        sx={{
          color: "#7f8fff !important",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          "&:hover": {
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
  setRows: PropTypes.func.isRequired,
  setItemsList: PropTypes.func,
  setIsModified: PropTypes.func,
  setChangesMade: PropTypes.func,
  requestFocusRow: PropTypes.func,
};

export default function EditableDataGrid(props) {
  const apiRef = useGridApiRef();
  const [rows, setRows] = React.useState(props.data);
  const pendingFocusRef = React.useRef(null);

  const { setItemsList, tableHeader, toggleRowsValid, setChangesMade, setIsModified } = props;
  const requestFocusRow = React.useCallback((id, field = "name") => {
    pendingFocusRef.current = { id, field };
  }, []);
  const makeRowId = React.useCallback(
    () => `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    []
  );

  const ensureOneEmptyTeamRow = React.useCallback((nextNumber = "") => {
    if (tableHeader !== "Teams") return;
    setRows((prev) => {
      const emptyIndex = prev.findIndex((r) => !String(r?.name || "").trim());
      if (emptyIndex !== -1) {
        const existingEmpty = prev[emptyIndex];
        const hasExistingNumber = String(existingEmpty?.number ?? "").trim() !== "";
        const shouldSetNumber =
          String(nextNumber ?? "").trim() !== "" && !hasExistingNumber;

        const updated = shouldSetNumber
          ? prev.map((r, i) =>
              i === emptyIndex ? { ...r, number: String(nextNumber) } : r
            )
          : prev;

        requestFocusRow(existingEmpty.id, "name");
        return updated;
      }
      const id = makeRowId();
      const appended = [...prev, { id, name: "", number: String(nextNumber), isNew: true }];
      requestFocusRow(id, "name");
      return appended;
    });
  }, [makeRowId, requestFocusRow, tableHeader]);

  const getNextTeamNumber = React.useCallback(
    (rowId) => {
      const idx = rows.findIndex((r) => r.id === rowId);
      if (idx > 0) {
        const prevVal = Number(rows[idx - 1]?.number);
        if (Number.isFinite(prevVal) && prevVal >= 0) return prevVal + 1;
      }
      const maxNum = rows.reduce((max, r) => {
        const n = Number(r?.number);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);
      return maxNum + 1;
    },
    [rows]
  );

  useEffect(() => {
    if (tableHeader === "Teams") {
      if (
        !rows.map((row) => row.name).every((name) => name.length > 0) ||
        !rows.map((row) => row.number).every((number) => number > -1) ||
        hasDuplicates(rows.map((row) => row.number)) ||
        rows.length === 0
      ) {
        toggleRowsValid(false);
      } else {
        toggleRowsValid(true);
      }
    }
    if (tableHeader === "Stages") {
      if (!rows.map((row) => row.name).every((name) => name.length > 0) || rows.length === 0) {
        toggleRowsValid(false);
      } else {
        toggleRowsValid(true);
      }
    }
  }, [rows, tableHeader, toggleRowsValid]);

  const hasRow = React.useCallback(
    (id) => rows.some((r) => String(r.id) === String(id)),
    [rows]
  );

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    if (!hasRow(pending.id)) return;
    requestAnimationFrame(() => {
      try {
        apiRef.current?.setCellFocus(pending.id, pending.field);
        apiRef.current?.startCellEditMode({ id: pending.id, field: pending.field });
      } catch {
        return;
      } finally {
        pendingFocusRef.current = null;
      }
    });
  }, [apiRef, hasRow, rows]);

  const handleDeleteClick = (e) => () => {
    setRows(rows.filter((row) => row.id !== e.id));
    props.deleteItem(e);
  };

  const processRowUpdate = (newRow) => {
    props.updateItem(newRow);
    const updatedRow = { ...newRow, isEdited: true };
    setRows((prev) => prev.map((row) => (row.id === newRow.id ? updatedRow : row)));
    setIsModified(true);
    setChangesMade(true);
    if (tableHeader === "Teams") {
      const hasName = String(updatedRow?.name || "").trim().length > 0;
      const hasNumber = String(updatedRow?.number ?? "").trim().length > 0;
      if (hasName && hasNumber) {
        const nextAuto = Number(updatedRow.number);
        ensureOneEmptyTeamRow(Number.isFinite(nextAuto) ? nextAuto + 1 : "");
      }
    }
    return updatedRow;
  };

  const TeamNameEditCell = React.useCallback(
    (params) => {
      const { id, value = "", api } = params;
      return (
        <TextField
          value={value}
          variant="outlined"
          autoComplete="off"
          autoFocus
          fullWidth
          size="small"
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              border: "none !important",
            },
            "& .MuiInputBase-input": {
              color: "#f5f7ff",
              padding: "4px 0",
            },
          }}
          onChange={(e) => {
            api.setEditCellValue({ id, field: "name", value: e.target.value }, e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!hasRow(id)) return;
              const currentNumber = params.row?.number;
              const hasNumber = String(currentNumber ?? "").trim() !== "";
              const nextNumber =
                String(currentNumber ?? "").trim() === "" ? getNextTeamNumber(id) : currentNumber;

              api.setEditCellValue({ id, field: "number", value: String(nextNumber) }, e);

              if (hasNumber) {
                const nextAuto = Number(nextNumber);
                ensureOneEmptyTeamRow(Number.isFinite(nextAuto) ? nextAuto + 1 : "");
                return;
              }

              setTimeout(() => {
                try {
                  api.startCellEditMode({ id, field: "number" });
                } catch {
                  return;
                }
              }, 0);
            }
          }}
        />
      );
    },
    [ensureOneEmptyTeamRow, getNextTeamNumber, hasRow]
  );

  const TeamNumberEditCell = React.useCallback(
    (params) => {
      const { id, value = "", api } = params;
      return (
        <TextField
          value={value}
          variant="outlined"
          autoComplete="off"
          autoFocus
          fullWidth
          size="small"
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              border: "none !important",
            },
            "& .MuiInputBase-input": {
              color: "#f5f7ff",
              padding: "4px 0",
            },
          }}
          inputProps={{ inputMode: "numeric", maxLength: 4, pattern: "\\d*" }}
          onChange={(e) => {
            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
            api.setEditCellValue({ id, field: "number", value: digitsOnly }, e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              if (!hasRow(id)) return;
              const currentNum = Number(value);
              const nextAuto = Number.isFinite(currentNum) ? currentNum + 1 : "";
              api.stopCellEditMode({ id, field: "number" });
              setTimeout(() => {
                try {
                  api.stopCellEditMode({ id, field: "name" });
                } catch {
                  return;
                }
              }, 0);
              ensureOneEmptyTeamRow(nextAuto);
            }
          }}
        />
      );
    },
    [ensureOneEmptyTeamRow, hasRow]
  );

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
      maxWidth: 220,
      flex: 4,
      preProcessEditCellProps: (params) => {
        const hasError = params.props.value.length === "";
        return { ...params.props, error: hasError };
      },
      renderEditCell: tableHeader === "Teams" ? TeamNameEditCell : undefined,
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
      renderEditCell: tableHeader === "Teams" ? TeamNumberEditCell : undefined,
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "actions",
      headerAlign: "right",
      align: "right",
      sortable: false,
      maxWidth: 120,
      flex: 0.7,
      cellClassName: "actions",
      getActions: (e) => {
        return [
          <GridActionsCellItem
            key={`delete-${e.id}`}
            icon={<DeleteIcon color="error" />}
            label="Delete"
            className="textPrimary"
            onClick={handleDeleteClick(e)}
            color="inherit"
          />,
        ];
      },
    },
  ];

  return (
    <Box
      sx={{
        height: props.gridHeight || 350,
        padding: "15px",
        border: "1px solid #d3d3d3",
        backgroundColor: "#050b1a",
        width: "100%",
        "& .actions": {
          color: "text.secondary",
        },
        "& .textPrimary": {
          color: "text.primary",
        },

        "& .MuiDataGrid-cell.invalid.MuiDataGrid-cell--editing:focus-within ": {
          outline: "solid #ba000d 2px",
        },

        "& MuiButtonBase-root": {
          display: "none",
        },

        "& .MuiDataGrid-cell.invalid": {
          outline: "solid #ba000d 1px",
          backgroundColor: "#ffd1d1 ",
          outlineOffset: "-1px",
        },
        "& .MuiDataGrid-main": {
          backgroundColor: "#050b1a !important",
        },
        "& .MuiDataGrid-virtualScroller": {
          backgroundColor: "#050b1a !important",
        },
        "& .MuiDataGrid-filler": {
          backgroundColor: "#050b1a !important",
        },
        "& .MuiDataGrid-row": {
          backgroundColor: "#050b1a !important",
        },
        "& .MuiDataGrid-footerContainer": {
          backgroundColor: "#050b1a !important",
          borderTop: "1px solid #242d44 !important",
        },
        "& .MuiDataGrid-toolbarContainer": {
          backgroundColor: "#050b1a !important",
        },
        "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
          outline: "none !important",
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
      }}
    >
      <DataGrid
        apiRef={apiRef}
        rows={rows.map((item, index) => ({
          ...item,
          counter: index + 1,
        }))}
        columns={
          tableHeader === "Teams"
            ? columns.filter((col) => col.field !== "battle")
            : columns.filter((col) => col.field !== "number")
        }
        disableColumnFilter={true}
        disableColumnMenu={true}
        disableColumnSelector={true}
        disableColumnSorting={true}
        hideFooterPagination={true}
        hideFooterSelectedRowCount={true}
        editMode="cell"
        processRowUpdate={processRowUpdate}
        slots={{
          footer: EditToolbar,
        }}
        slotProps={{
          footer: {
            setRows,
            setItemsList,
            setIsModified,
            setChangesMade,
            tableHeader,
            requestFocusRow,
          },
        }}
        components={{
          Footer: EditToolbar,
        }}
        componentsProps={{
          footer: {
            setRows,
            setItemsList,
            setIsModified,
            setChangesMade,
            tableHeader,
            requestFocusRow,
          },
        }}
        experimentalFeatures={{ newEditingApi: true }}
        onProcessRowUpdateError={(error) => {
          return;
        }}
        onCellEditCommit={() => {
          setChangesMade(true);
          setIsModified(true);
        }}
        // getCellClassName={({ value, field, row }) => {
        //   if (field === "name" && (value.length < 1 || value.length > 20)) {
        //     return "invalid";
        //   }
        //   if (
        //     field === "number" &&
        //     (rows.filter((rowItem) => rowItem.number === row.number).length >
        //       1 ||
        //       row.number < 0)
        //   ) {
        //     return "invalid";
        //   }
        // }}
        isCellEditable={(params) => {
          return params.field !== "battle" || !params.row.inDB;
        }}
      />
    </Box>
  );
}
