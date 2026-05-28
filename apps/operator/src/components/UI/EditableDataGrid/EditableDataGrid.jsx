import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import { DataGrid, GridActionsCellItem, GridToolbarContainer } from "@mui/x-data-grid";
import hasDuplicates from "../../../utils/hasDuplicates";

function EditToolbar(props) {
  const { setRows, setIsModified, setChangesMade, tableHeader } = props;

  const handleClick = () => {
    setRows((oldRows) => {
      const nextNumber =
        tableHeader === "Teams"
          ? String(
              oldRows.reduce((max, row) => {
                const value = Number(row?.number);
                return Number.isFinite(value) ? Math.max(max, value) : max;
              }, 0) + 1
            )
          : "";

      const id = `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      return [
        ...oldRows,
        {
          id,
          name: "",
          number: nextNumber,
          battle: "No",
          isNew: true,
        },
      ];
    });

    setIsModified(true);
    setChangesMade(true);
  };

  return (
    <GridToolbarContainer sx={{ justifyContent: "end" }}>
      <Button
        variant="text"
        onClick={handleClick}
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
  setRows: PropTypes.func.isRequired,
  setIsModified: PropTypes.func,
  setChangesMade: PropTypes.func,
  tableHeader: PropTypes.string,
};

export default function EditableDataGrid(props) {
  const [rows, setRows] = React.useState(props.data);
  const { tableHeader, toggleRowsValid, setChangesMade, setIsModified } = props;

  React.useEffect(() => {
    setRows(props.data);
  }, [props.data]);

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

  const handleDeleteClick = (row) => () => {
    setRows((prev) => prev.filter((item) => item.id !== row.id));
    props.deleteItem(row);
    setChangesMade(true);
    setIsModified(true);
  };

  const processRowUpdate = (newRow) => {
    const updatedRow = {
      ...newRow,
      name: String(newRow?.name || "").trim(),
      number: tableHeader === "Teams" ? String(newRow?.number || "").trim() : newRow?.number,
      battle: newRow?.battle || "No",
      isEdited: true,
    };

    setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)));
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
      maxWidth: 220,
      flex: 4,
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
        "& .MuiDataGrid-main": {
          backgroundColor: "#050b1a !important",
          overflow: "hidden",
        },
        "& .MuiDataGrid-virtualScroller": {
          backgroundColor: "#050b1a !important",
          marginTop: "0 !important",
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
          fontWeight: 500,
          fontSize: "17px",
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
        rows={rows.map((item, index) => ({
          ...item,
          counter: index + 1,
        }))}
        columns={
          tableHeader === "Teams"
            ? columns.filter((col) => col.field !== "battle")
            : columns.filter((col) => col.field !== "number")
        }
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
        slots={{
          footer: EditToolbar,
        }}
        slotProps={{
          footer: {
            setRows,
            setIsModified,
            setChangesMade,
            tableHeader,
          },
        }}
        onProcessRowUpdateError={() => null}
        onRowEditStop={() => {
          setChangesMade(true);
          setIsModified(true);
        }}
        onMouseOverCapture={suppressNativeTitle}
        isCellEditable={(params) => params.field !== "battle" || !params.row.inDB}
      />
    </Box>
  );
}
