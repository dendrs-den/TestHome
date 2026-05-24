import React, { useCallback, useEffect, useState } from "react";
import { Button, IconButton } from "@mui/material";
import BaseDataGrid from "../../UI/BaseDataGrid/BaseDataGrid";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import getCurrentTournament from "../../../Api_requests/tournaments/getCurrentTournament";
import classes from "./RoundTable.module.scss";
import setCurrentRound from "../../../Api_requests/rounds/setCurrentRound";

const RoundTable = () => {
  const [selectedRow, setSelectedRow] = useState(0);
  const [rowData, setRowData] = useState([]);

  const columns = [
    {
      headerName: "",
      field: "indexActions",
      minWidth: 100,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        return (
          params.id === selectedRow && (
            <React.Fragment>
              <IconButton
                disabled={
                  rowData.findIndex((item) => item.id === params.id) === 0
                }
                className="upBtn"
                onClick={() => {
                  setRowData((prev) => {
                    let newRowData = structuredClone(prev);
                    const index = newRowData.findIndex(
                      (item) => item.id === params.id
                    );
                    const temp = newRowData[index];

                    newRowData[index] = {
                      ...newRowData[index - 1],
                      index: index + 1,
                    };

                    newRowData[index - 1] = { ...temp, index: index };
                    return newRowData;
                  });
                }}
              >
                <ArrowUpwardIcon />
              </IconButton>

              <IconButton
                disabled={
                  rowData.findIndex((item) => item.id === params.id) >=
                  rowData.length - 1
                }
                className="downBtn"
                onClick={() => {
                  setRowData((prev) => {
                    let newRowData = structuredClone(prev);
                    const index = newRowData.findIndex(
                      (item) => item.id === params.id
                    );
                    const temp = newRowData[index];
                    newRowData[index] = {
                      ...newRowData[index + 1],
                      index: index + 1,
                    };
                    newRowData[index + 1] = { ...temp, index: index + 2 };
                    return newRowData;
                  });
                }}
              >
                <ArrowDownwardIcon />
              </IconButton>
            </React.Fragment>
          )
        );
      },
    },
    {
      field: "index",
      headerName: "#",
      maxWidth: 50,
      flex: 1,
    },
    {
      field: "name",
      headerName: "Name",
      maxWidth: 250,
      flex: 6,
      sortable: false,
    },
    {
      field: "teamNumber",
      headerName: "Number",
      flex: 2,
      sortable: false,
    },
    {
      field: "time",
      headerName: "Time",
      flex: 2,
      sortable: false,
    },
    {
      field: "rank",
      headerName: "Rank",
      flex: 2,
      sortable: false,
    },
    {
      field: "roundAction",
      headerName: "Actions",
      flex: 3,
      sortable: false,
      minWidth: 200,
      renderCell: (params) => {
        return (
          <React.Fragment>
            <Button
              onClick={async () => {
                await setCurrentRound(params.row.index);
                // GO TO CONTROL ROUND
              }}
            >
              {params.row.time === "" ? "Play" : "Replay"}
            </Button>
            {params.row.time !== "" && <Button>Edit results</Button>}
          </React.Fragment>
        );
      },
    },
  ];

  const fetchCurrentTournament = useCallback(async () => {
    const currentTour = await getCurrentTournament();
    console.log(currentTour);
  }, []);

  useEffect(() => {
    fetchCurrentTournament();
  }, [fetchCurrentTournament]);

  const rowClickHandler = (params) => {
    console.log(params);
    setSelectedRow(params.row.index);
  };

  useEffect(() => {
    setRowData([
      {
        index: 1,
        name: "VasyaTeam",
        teamNumber: 228,
        time: "322",
        rank: "",
        id: 1,
      },
      {
        index: 2,
        name: "VasyaTeam2",
        teamNumber: 1337,
        time: "",
        rank: "",
        id: 2,
      },
      {
        index: 3,
        name: "VasyaTeam3",
        teamNumber: 322,
        time: "",
        rank: "",
        id: 3,
      },
    ]);
  }, [setRowData]);

  return (
    <BaseDataGrid
      className={classes["round_table"]}
      rows={rowData}
      columns={columns}
      onRowClick={rowClickHandler}
      disableColumnFilter={true}
      disableColumnMenu={true}
      disableColumnSelector={true}
      hideFooterPagination={true}
      hideFooterSelectedRowCount={true}
    />
  );
};

export default RoundTable;
