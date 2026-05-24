import React from "react";
import "./TournamentTable.css";
import { Button, IconButton } from "@mui/material";
import BaseDataGrid from "../../../Components/UI/BaseDataGrid/BaseDataGrid";
import EditIcon from "@mui/icons-material/Edit";

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
      headerName: "name",
      maxWidth: 250,
      flex: 2,
    },
    {
      field: "discipline",
      headerName: "discipline",
      flex: 5,
    },
    {
      headerName: "",
      align: "right",
      field: "edit",
      sortable: false,
      maxWidth: 100,
      flex: 2,
      renderCell: (params) => {
        return (
          <React.Fragment>
            <Button
              className="editBtn"
              variant="text"
              color="info"
              onClick={() => {
                props.changeContent("editTournament");
              }}
            >
              Edit
            </Button>
            <IconButton
              className="editBtn_small"
              onClick={() => {
                props.changeContent("editTournament");
              }}
            >
              <EditIcon />
            </IconButton>
          </React.Fragment>
        );
      },
    },
  ];

  const rowClickHandler = (params) => {
    // console.log(params.id);
    props.clickHandler(params.id);
  };

  const rowDoubleClickHandler = () => {
    props.doubleClickHandler();
  };

  const rowData = props.renderedData.map((tour, i) => {
    return {
      counter: i + 1,
      id: tour.id,
      title: tour.title,
      discipline: tour?.disciplines?.[0]?.name || "",
    };
  });

  return (
    <BaseDataGrid
      loading={props.tourDataLoading}
      className={"tournament_table"}
      rows={props.tourDataLoading ? [] : rowData}
      columns={columns}
      onRowClick={rowClickHandler}
      onRowDoubleClick={rowDoubleClickHandler}
      disableColumnFilter={true}
      disableColumnMenu={true}
      disableColumnSelector={true}
      hideFooterPagination={true}
      hideFooterSelectedRowCount={true}
    />
  );
};

export default TournamentsTable;
