import React from "react";
import "./TournamentTable.css";
import { Box, Button } from "@mui/material";
import BaseDataGrid from "../../../Components/UI/BaseDataGrid/BaseDataGrid";

const TournamentsTable = (props) => {
  const columns = [
    {
      field: "counter",
      headerName: "#",
      maxWidth: 50,
      flex: 1,
    },
    {
      field: "title",
      headerName: "Name",
      minWidth: 240,
      flex: 2.1,
    },
    {
      field: "discipline",
      headerName: "Discipline",
      minWidth: 170,
      flex: 1.3,
    },
    {
      field: "bustValue",
      headerName: "Bust value",
      minWidth: 120,
      flex: 1,
      align: "center",
      headerAlign: "center",
      cellClassName: "tableCellMono",
    },
    {
      field: "skipValue",
      headerName: "Skip value",
      minWidth: 120,
      flex: 1,
      align: "center",
      headerAlign: "center",
      cellClassName: "tableCellMono",
    },
    {
      headerName: "Actions",
      align: "center",
      headerAlign: "center",
      field: "actions",
      sortable: false,
      minWidth: 180,
      flex: 1.25,
      renderCell: (params) => {
        return (
          <Box className="actionsCell">
            <Button
              className="actionBtn actionBtnPrimary"
              variant="outlined"
              size="small"
              onClick={async (event) => {
                event.stopPropagation();
                props.setSelectedId?.(params.row.id);
                await props.openTournament?.(params.row.id);
              }}
            >
              Open
            </Button>
            <Button
              className="actionBtn actionBtnSecondary"
              variant="outlined"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                props.setSelectedId?.(params.row.id);
                props.changeContent("editTournament");
              }}
            >
              Edit
            </Button>
          </Box>
        );
      },
    },
  ];

  const rowClickHandler = (params) => {
    // console.log(params.id);
    props.clickHandler(params.id);
  };

  const rowData = props.renderedData.map((tour, i) => {
    return {
      counter: i + 1,
      id: tour.id,
      title: tour.title,
      discipline: tour?.disciplines?.[0]?.name || "",
      bustValue:
        tour?.bust_value !== null && tour?.bust_value !== undefined
          ? `${tour.bust_value}`
          : "-",
      skipValue:
        tour?.skip_value !== null && tour?.skip_value !== undefined
          ? `${tour.skip_value}`
          : "-",
    };
  });

  return (
    <BaseDataGrid
      loading={props.tourDataLoading}
      className={"tournament_table"}
      rows={props.tourDataLoading ? [] : rowData}
      columns={columns}
      rowHeight={72}
      columnHeaderHeight={56}
      onRowClick={rowClickHandler}
      getRowClassName={(params) =>
        params.id === props.selectedId ? "tournamentRow tournamentRow--active" : "tournamentRow"
      }
      disableColumnFilter={true}
      disableColumnMenu={true}
      disableColumnSelector={true}
      hideFooterPagination={true}
      hideFooterSelectedRowCount={true}
    />
  );
};

export default TournamentsTable;
