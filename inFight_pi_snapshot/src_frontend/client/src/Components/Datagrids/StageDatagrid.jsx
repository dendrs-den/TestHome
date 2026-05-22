import { Box, Button, IconButton } from "@mui/material";
import { Fragment } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import BaseDataGrid from "../UI/BaseDataGrid/BaseDataGrid";
import { GridToolbarContainer } from "@mui/x-data-grid";
import { useState } from "react";

function EditToolbar(props) {
  return (
    <GridToolbarContainer sx={{ justifyContent: "end" }}>
      <Button color="primary">Add</Button>
    </GridToolbarContainer>
  );
}

const StageDataGrid = ({ rows }) => {
  const [selectedRow, setSelectedRow] = useState(0);
  const [rowData, setRowData] = useState([]);
  const columns = [
    {
      field: "counter",
      headerName: "#",
      maxWidth: 50,
      flex: 1,
    },
    {
      field: "switch",
      headerName: "",
      maxWidth: 100,
      flex: 1,
      renderCell: ({ row }) => {
        return (
          row.id === selectedRow && (
            <Fragment>
              <IconButton
                disabled={row.index === row.totalCount - 1}
                onClick={() => {
                  console.log(row);
                  setRowData((prev) => {
                    let newRowData = [...prev];
                    const index = row.index;
                    const temp = newRowData[index];
                    newRowData[index] = {
                      ...newRowData[index + 1],
                      index: index + 1,
                    };
                    newRowData[index + 1] = { ...temp, index: index + 2 };
                    console.log(newRowData);
                    return newRowData;
                  });
                }}
              >
                <ArrowDropDownIcon />
              </IconButton>

              <IconButton
                disabled={row.index === 0}
                onClick={(params) => {
                  console.log(row);
                  setRowData((prev) => {
                    let newRowData = [...prev];
                    const index = row.index;
                    const temp = newRowData[index];

                    newRowData[index] = {
                      ...newRowData[index - 1],
                      index: index + 1,
                    };

                    newRowData[index - 1] = { ...temp, index: index };
                    console.log(newRowData);
                    return newRowData;
                  });
                  console.log(row);
                }}
              >
                <ArrowDropUpIcon />
              </IconButton>
            </Fragment>
          )
        );
      },
    },
    {
      field: "name",
      headerName: "name",
      maxWidth: 250,
      flex: 2,
    },
    {
      field: "time",
      headerName: "time",
      maxWidth: 100,
      flex: 1,
    },
    {
      field: "number",
      headerName: "number",
      maxWidth: 100,
      flex: 1,
    },
    {
      field: "rank",
      headerName: "rank",
      maxWidth: 100,
      flex: 2,
    },
    {
      field: "actions",
      sortable: false,
      type: "actions",
      headerName: "Actions",
      maxWidth: 250,
      align: "right",
      flex: 1,
      cellClassName: "actions",
      renderCell: ({ row }) => {
        return (
          row.id === selectedRow && (
            <Box
              width={"100%"}
              sx={{
                display: "flex",
                justifyContent: "end",
                gap: "10px",
              }}
            >
              <Button variant="outlined" color="primary">
                Start
              </Button>
              <Button variant="outlined" color="primary">
                Edit results
              </Button>
            </Box>
          )
        );
      },
    },
  ];

  const rowClickHandler = ({ row }) => {
    console.log(row);
    setSelectedRow(row.id);
  };

  return (
    <BaseDataGrid
      sx={{
        height: "320px",
        "& .selected-true": {
          fontWeight: "bold",
          backgroundColor: "rgba(86, 44, 255, 0.1) !important",
        },
      }}
      columns={columns}
      rows={rows}
      onRowClick={rowClickHandler}
      components={{
        Footer: EditToolbar,
      }}
      getRowClassName={(params) => {
        return `selected-${params.row.id === selectedRow}`;
      }}
    />
  );
};

export default StageDataGrid;
