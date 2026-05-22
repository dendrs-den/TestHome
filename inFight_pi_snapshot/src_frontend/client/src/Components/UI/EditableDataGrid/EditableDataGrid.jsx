import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import { GridRowModes, GridToolbarContainer, GridActionsCellItem } from "@mui/x-data-grid";

import { DataGrid } from "@mui/x-data-grid";
import { useEffect } from "react";
import hasDuplicates from "../../../utils/hasDuplicates";

function EditToolbar(props) {
  const { setRows, setRowModesModel, setIsModified, setChangesMade } = props;

  const handleClick = () => {
    const id = String(Math.random() * 10);

    setRows((oldRows) => [...oldRows, { id, name: "", isNew: true, battle: "No", number: 0 }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: "name" },
    }));
    setIsModified(true);
    setChangesMade(true);
  };

  return (
    <GridToolbarContainer sx={{ justifyContent: "end" }}>
      <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
        Add
      </Button>
    </GridToolbarContainer>
  );
}

EditToolbar.propTypes = {
  setRowModesModel: PropTypes.func.isRequired,
  setRows: PropTypes.func.isRequired,
  setItemsList: PropTypes.func,
  setIsModified: PropTypes.func,
  setChangesMade: PropTypes.func,
};

export default function EditableDataGrid(props) {
  const [rows, setRows] = React.useState(props.data);
  const [rowModesModel, setRowModesModel] = React.useState({});
  const [selectedId, setSelectedId] = React.useState("");

  const { setItemsList, tableHeader, toggleRowsValid, setChangesMade, setIsModified } = props;

  useEffect(() => {
    const modes = Object.values(rowModesModel).map((el) => el.mode);
    if (modes.includes("edit")) {
      toggleRowsValid(false);
    } else if (modes.every((mode) => mode === "view")) {
      toggleRowsValid(true);
    }
  }, [rowModesModel, toggleRowsValid]);

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

  const handleRowEditStart = (params, event) => {
    event.defaultMuiPrevented = true;
  };

  const handleRowEditStop = (params, event) => {
    setRowModesModel({
      ...rowModesModel,
      [params.id]: { mode: GridRowModes.View },
    });

    event.defaultMuiPrevented = true;
  };

  const handleDeleteClick = (e) => () => {
    setRows(rows.filter((row) => row.id !== e.id));
    props.deleteItem(e);
  };

  const processRowUpdate = (newRow) => {
    props.updateItem(newRow);
    const updatedRow = { ...newRow, isEdited: true };
    setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
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
      preProcessEditCellProps: (params) => {
        const hasError = params.props.value.length === "";
        return { ...params.props, error: hasError };
      },
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
      type: "number",
      sortable: false,
      editable: true,
      maxWidth: 100,
      flex: 0.6,
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
        height: 350,
        padding: "15px",
        border: "1px solid #d3d3d3",
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
        disableColumnFilter={true}
        disableColumnMenu={true}
        disableColumnSelector={true}
        hideFooterPagination={true}
        hideFooterSelectedRowCount={true}
        editMode="cell"
        rowModesModel={rowModesModel}
        onRowEditStart={handleRowEditStart}
        onRowEditStop={handleRowEditStop}
        processRowUpdate={processRowUpdate}
        components={{
          Footer: EditToolbar,
        }}
        componentsProps={{
          footer: {
            setRows,
            setRowModesModel,
            setItemsList,
            setIsModified,
            setChangesMade,
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
        onCellEditStop={({ id }) => {
          setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View },
          });
        }}
        onCellFocusOut={({ id }) => {
          if (id !== selectedId) {
            setRowModesModel({
              ...rowModesModel,
              [id]: { mode: GridRowModes.View },
            });
          }
        }}
        onRowClick={({ id }) => {
          if (id !== selectedId) {
            setRowModesModel({
              ...rowModesModel,
              [selectedId]: { mode: GridRowModes.View },
            });
            setSelectedId(id);
          }
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
