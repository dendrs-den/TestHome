import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
} from "@mui/material";
import { GridActionsCellItem, GridToolbarContainer } from "@mui/x-data-grid";
import { Fragment, useState, useCallback, useEffect } from "react";
import getCurrentTournament from "../../Api_requests/tournaments/getCurrentTournament";
import BaseDataGrid from "../../Components/UI/BaseDataGrid/BaseDataGrid";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import roundUpdateTeam from "../../Api_requests/rounds/roundUpdateTeam";
import swapTeamPositions from "../../Api_requests/rounds/roundSwapCommands";
import setCurrentRound from "../../Api_requests/rounds/setCurrentRound";
import formatTime from "../../utils/formatTime";
import EditResultsBackDrop from "../RefereePage/RoundUtilitiesBlock/EditResultsBackDrop/EditResultsBackDrop";
import updateCurrentTournament from "../../Api_requests/tournaments/updateCurrentTournament";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import setAdministrationState from "../../Api_requests/coreStateManagement/setAdministrationState";

const defaultTeam = {
  team: null,
  stage: null,
  faults: [],
  crossings: [],
  time_real: null,
  time_result: null,
  stage_rank: 0,
  tournament_rank: 0,
};

function EditToolbar(props) {
  const { currentTour, stageId, fetchCurrentTournament } = props;

  const addNewRound = async () => {
    const tourTemp = { ...currentTour };

    const foundStage = currentTour.stages.find((stage) => stage.id === stageId);
    const lastIndex = currentTour.round
      .map((round) => round.stage.id)
      .findLastIndex((id) => id === stageId);

    // inserting new round with empty team an array of all rounds, assign stage to it
    tourTemp.round.splice(lastIndex + 1, 0, {
      ...defaultTeam,
      stage: foundStage,
    });
    // send updated tour info (rounds array specifically) and refetch tourData to display changes
    await updateCurrentTournament(tourTemp);
    fetchCurrentTournament();
  };
  return (
    <GridToolbarContainer sx={{ justifyContent: "end", paddingTop: "15px" }}>
      <Button
        sx={{
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
        color="primary"
        onClick={addNewRound}
        startIcon={<AddIcon />}
      >
        Add
      </Button>
    </GridToolbarContainer>
  );
}

const TournamentsRounds = (props) => {
  const { changeContent, changeBlockTitle } = props;
  const [currentTour, setCurrentTour] = useState({});
  const [rowData, setRowData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(0);
  const [open, setOpen] = useState(false);

  const startRound = useCallback(
    async (roundId) => {
      await setCurrentRound(roundId);
      changeContent("refereePanel");
    },
    [changeContent]
  );

  const handleRowModelChange = async (params) => {
    // params.defaultMuiPrevented = true;
    const roundIndex = Object.keys(params)[0];
    const teamId = params[roundIndex]?.name?.value;

    // check if we received team's id, not team's name - id's length is always 30
    if (roundIndex && teamId && teamId.length > 20) {
      await roundUpdateTeam(roundIndex, teamId);
      await fetchCurrentTournament();
    }
  };

  const fetchCurrentTournament = useCallback(async () => {
    const currentTour = await getCurrentTournament();
    setCurrentTour(currentTour);
    setRowData(currentTour?.round);
    changeBlockTitle(currentTour?.name);
  }, [changeBlockTitle]);

  const showBackDrop = useCallback(async (roundId) => {
    await setCurrentRound(roundId);

    // #73425 - refactor is needed , we do not want to change state manually
    await setAdministrationState();
    setOpen(true);
  }, []);

  const deleteSelectedRound = useCallback(
    async (row) => {
      const tourTemp = { ...currentTour };
      tourTemp.round = tourTemp.round.filter(
        (round, i) => i !== row.roundsArrId
      );

      await updateCurrentTournament(tourTemp);

      const tour = await getCurrentTournament();
      setCurrentTour(tour);
      setRowData(tour.round);
    },
    [currentTour]
  );

  const columns = [
    {
      field: "counter",
      headerName: "#",
      maxWidth: 50,
      flex: 1,
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
      headerName: "actions",
      maxWidth: 340,
      flex: 3,
      cellClassName: "actions",
      renderCell: ({ row }) => {
        const { roundsArrId } = row;

        return (
          // roundsArrId === selectedRow &&
          row.id === selectedRow.teamId &&
          row.stageId === selectedRow.stageId && (
            <Box
              width={"100%"}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <Box>
                <IconButton
                  disabled={row.index === row.totalCount - 1}
                  onClick={async () => {
                    let newRowData = [...rowData];

                    const index = row.id;
                    const temp = newRowData[index];
                    newRowData[index] = {
                      ...newRowData[index + 1],
                      index: index + 1,
                    };
                    newRowData[index + 1] = { ...temp, index: index + 2 };

                    // SET NEW ROUNDS ORDERs
                    await swapTeamPositions(index, index + 1);
                    await fetchCurrentTournament();
                    setSelectedRow({
                      teamId: row.id + 1,
                      stageId: row.stageId,
                    });
                  }}
                >
                  <ArrowDropDownIcon />
                </IconButton>
                <IconButton
                  disabled={row.index === 0}
                  onClick={async () => {
                    let newRowData = [...rowData];

                    const index = row.id;

                    const temp = newRowData[index];
                    newRowData[index] = {
                      ...newRowData[index - 1],
                      index: index + 1,
                    };

                    // SET NEW ROUNDS ORDER
                    newRowData[index - 1] = { ...temp, index: index };
                    await swapTeamPositions(index, index - 1);
                    await fetchCurrentTournament();
                    setSelectedRow({
                      teamId: row.id - 1,
                      stageId: row.stageId,
                    });
                  }}
                >
                  <ArrowDropUpIcon />
                </IconButton>
              </Box>
              <Box display="flex" gap="8px">
                <Button
                  // disabled={row.name?.length > 20 || !row.name}
                  disabled={!row.name}
                  variant="outlined"
                  color="primary"
                  onClick={() => startRound(roundsArrId)}
                >
                  {!row.crossings ||
                  (row.crossings && row.crossings.length === 0)
                    ? "Play"
                    : "Replay"}
                </Button>
                {row.crossings && row.crossings.length > 0 && (
                  <Button
                    onClick={() => showBackDrop(roundsArrId)}
                    variant="outlined"
                    color="primary"
                  >
                    Edit results
                  </Button>
                )}
              </Box>
            </Box>
          )
        );
      },
    },
    {
      field: "deleteField",
      sortable: false,
      type: "actions",
      headerName: "",
      maxWidth: 200,
      align: "right",
      flex: 0.7,
      renderCell: ({ row }) => {
        return (
          row.id === selectedRow.teamId &&
          row.stageId === selectedRow.stageId &&
          row.stage.battle && (
            <GridActionsCellItem
              icon={
                <DeleteIcon
                  sx={{
                    color: "#ff0000",
                  }}
                />
              }
              label="Delete"
              className="textPrimary"
              onClick={() => {
                deleteSelectedRound(row);
              }}
              color="inherit"
            />
          )
        );
      },
    },
  ];

  const battleDataGridColumns = [...columns].map((col) =>
    col.field === "name"
      ? {
          ...col,
          type: "singleSelect",
          valueOptions: currentTour?.teams?.map((team) => ({
            value: team.id,
            label: `${team.name}`,
          })),
          renderCell: (params) => {
            return (
              (params.row.name?.length === 30 && <CircularProgress />) ||
              params.row.name
            );
          },
          editable: true,
        }
      : col
  );

  const { stages = null } = currentTour;

  useEffect(() => {
    setAdministrationState();
  }, []);

  useEffect(() => {
    fetchCurrentTournament();
  }, [fetchCurrentTournament]);

  useEffect(() => {
    if (open === false) {
      fetchCurrentTournament();
    }
  }, [open, fetchCurrentTournament]);

  const rowClickHandler = ({ row }) => {
    setSelectedRow({ teamId: row.id, stageId: row.stageId });
  };

  const goToTourList = useCallback(() => {
    window.stop();
    changeBlockTitle("Tournaments");
    changeContent("tournamentsList");
  }, [changeBlockTitle, changeContent]);

  return (
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        margin: "auto",
        "& h5": {
          paddingLeft: "10px",
          paddingBottom: "10px",
          marginTop: "30px",
          fontSize: "16px",
          color: "#3c2bfe",
        },
      }}
    >
      {stages && (
        <Fragment>
          <Grid>
            {stages.map(({ id: stageId, name: stageName, battle }) => {
              const filteredRows = rowData
                ?.map((item2, i) => ({ ...item2, id: i, roundsArrId: i }))
                .filter((item) => item.stage.id === stageId);

              const countedRows = filteredRows.map(
                ({ team, time_result, stage_rank, ...rest }, j) => ({
                  ...rest,
                  index: j,
                  counter: j + 1,
                  totalCount: filteredRows?.length,
                  name: team?.name,
                  number: [null, undefined].includes(team?.number)
                    ? "-"
                    : team?.number,
                  time: [null, undefined].includes(time_result)
                    ? "-"
                    : formatTime(time_result).fullTime(),
                  rank: [null, undefined].includes(stage_rank)
                    ? "-"
                    : stage_rank,
                  stageId,
                })
              );
              return (
                <Box
                  key={stageId}
                  mt="15px"
                  border=" 1px solid rgba(224, 224, 224, 1)"
                  paddingBottom="10px"
                >
                  <h5>
                    {stageName.toUpperCase()} ({battle ? "BATTLE" : "NO-BATTLE"}
                    )
                  </h5>
                  {battle === false && (
                    <BaseDataGrid
                      sx={{
                        height: "320px",
                        "& .MuiDataGrid-row.Mui-selected": {
                          backgroundColor: "#FFF !important",
                        },
                        "& .MuiDataGrid-row.selected-true": {
                          fontWeight: "bold",
                          backgroundColor: "rgba(86, 44, 255, 0.1) !important",
                        },
                      }}
                      columns={columns}
                      rows={countedRows}
                      onRowClick={rowClickHandler}
                      getRowClassName={({ row }) => {
                        return `selected-${
                          row.id === selectedRow.teamId &&
                          row.stageId === selectedRow.stageId
                        }`;
                      }}
                    />
                  )}
                  {battle === true && (
                    <BaseDataGrid
                      sx={{
                        height: "320px",
                        "& .MuiDataGrid-row.Mui-selected": {
                          backgroundColor: "#FFF !important",
                        },
                        "& .MuiDataGrid-row.selected-true": {
                          fontWeight: "bold",
                          backgroundColor: "rgba(86, 44, 255, 0.1) !important",
                        },
                      }}
                      editMode="cell"
                      columns={battleDataGridColumns}
                      rows={countedRows}
                      onRowClick={rowClickHandler}
                      disableColumnFilter={true}
                      disableColumnMenu={true}
                      disableColumnSelector={true}
                      hideFooterPagination={true}
                      hideFooterSelectedRowCount={true}
                      onEditRowsModelChange={handleRowModelChange}
                      isCellEditable={(params) => {
                        return !params.row.name;
                      }}
                      components={{
                        Footer: EditToolbar,
                      }}
                      componentsProps={{
                        footer: {
                          stageId,
                          currentTour,
                          fetchCurrentTournament,
                        },
                      }}
                      getRowClassName={({ row }) => {
                        return `selected-${
                          row.id === selectedRow.teamId &&
                          row.stageId === selectedRow.stageId
                        }`;
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Grid>

          <Button
            variant="outlined"
            color="error"
            sx={{
              marginTop: "30px",
              alignSelf: "flex-end",
              padding: "12px 30px",
              fontWeight: "500",
              fontSize: "14px",
              lineHeight: "17px",
            }}
            onClick={goToTourList}
          >
            Back
          </Button>
        </Fragment>
      )}
      <EditResultsBackDrop open={open} setOpen={setOpen} />
    </Container>
  );
};

export default TournamentsRounds;
