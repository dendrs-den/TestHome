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
import formatTime from "../../utils/formatTime";
import EditResultsBackDrop from "../RefereePage/RoundUtilitiesBlock/EditResultsBackDrop/EditResultsBackDrop";
import updateCurrentTournament from "../../Api_requests/tournaments/updateCurrentTournament";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import setAdministrationState from "../../Api_requests/coreStateManagement/setAdministrationState";
import "./TournamentsRounds.css";

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

const makeRoundId = (stageId, teamId, index = 0) =>
  `round-${String(stageId || "stage")}-${String(teamId || `team-${index}`)}`;

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
  const { changeContent, changeBlockTitle, setFooterActions } = props;
  const [currentTour, setCurrentTour] = useState({});
  const [rowData, setRowData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(() => {
    try {
      const raw = sessionStorage.getItem("legacyRefContext");
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        parsed.returnFocus &&
        typeof parsed.returnFocus.teamId !== "undefined" &&
        typeof parsed.returnFocus.stageId !== "undefined"
      ) {
        return parsed.returnFocus;
      }
    } catch {}
    return 0;
  });
  const [open, setOpen] = useState(false);

  const startRound = useCallback(
    async (roundId, row) => {
      try {
        const payload = {
          tournamentId: currentTour?.id || "event-main",
          tournamentName: currentTour?.name || "",
          stageName: row?.stage?.name || "",
          teamName: row?.name || row?.team?.name || "",
          roundId: row?.roundId || `round-${roundId}`,
          returnFocus: {
            teamId: row?.id,
            stageId: row?.stageId,
          },
        };
        sessionStorage.setItem("legacyRefContext", JSON.stringify(payload));
      } catch {}
      window.location.assign("/legacy-ref");
    },
    [currentTour?.id, currentTour?.name]
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

  const buildDefaultRounds = useCallback((tour) => {
    const stages = Array.isArray(tour?.stages) ? tour.stages : [];
    const teams = Array.isArray(tour?.teams) ? tour.teams : [];
    const rounds = [];

    stages.forEach((stage) => {
      teams.forEach((team, index) => {
        rounds.push({
          ...defaultTeam,
          id: makeRoundId(stage?.id, team?.id, index),
          stage,
          team,
        });
      });
    });

    return rounds;
  }, []);

  const fetchCurrentTournament = useCallback(async () => {
    const loadedTour = await getCurrentTournament();
    if (!loadedTour || typeof loadedTour !== "object") {
      setCurrentTour({});
      setRowData([]);
      changeBlockTitle("Tournament");
      return;
    }

    const hasRounds = Array.isArray(loadedTour.round) && loadedTour.round.length > 0;
    const hasStages = Array.isArray(loadedTour.stages) && loadedTour.stages.length > 0;
    const hasTeams = Array.isArray(loadedTour.teams) && loadedTour.teams.length > 0;
    const roundsNeedIds =
      hasRounds &&
      loadedTour.round.some(
        (round, index) => !round?.id && round?.stage?.id && round?.team?.id
      );

    let normalizedTour = loadedTour;
    if (!hasRounds && hasStages && hasTeams) {
      normalizedTour = {
        ...loadedTour,
        round: buildDefaultRounds(loadedTour),
      };
    } else if (roundsNeedIds) {
      normalizedTour = {
        ...loadedTour,
        round: loadedTour.round.map((round, index) => ({
          ...round,
          id: round.id || makeRoundId(round?.stage?.id, round?.team?.id, index),
        })),
      };
    }

    if (normalizedTour !== loadedTour) {
      try {
        await updateCurrentTournament(normalizedTour);
      } catch (error) {
        console.log("failed to persist generated rounds", error);
      }
    }

    setCurrentTour(normalizedTour);
    setRowData(Array.isArray(normalizedTour?.round) ? normalizedTour.round : []);
    changeBlockTitle(normalizedTour?.name || "Tournament");
  }, [buildDefaultRounds, changeBlockTitle]);

  const showBackDrop = useCallback(async () => {
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
      headerName: "Name",
      maxWidth: 250,
      flex: 2,
    },
    {
      field: "time",
      headerName: "Time",
      maxWidth: 100,
      flex: 1,
    },
    {
      field: "number",
      headerName: "Number",
      maxWidth: 100,
      flex: 1,
    },
    {
      field: "rank",
      headerName: "Rank",
      maxWidth: 100,
      flex: 2,
    },
    {
      field: "actions",
      sortable: false,
      type: "actions",
      headerName: "Actions",
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
                  onClick={() => startRound(roundsArrId, row)}
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
  const roundsGridSx = {
    height: "320px",
    "--DataGrid-bg": "#050b1a",
    "--DataGrid-containerBackground": "#141c2d",
    "--DataGrid-t-header-background-base": "#141c2d",
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: "#141c2d !important",
      borderBottom: "1px solid #2b3551 !important",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      color: "#dbe3ff !important",
      fontWeight: 500,
      fontSize: "17px",
      textTransform: "capitalize",
    },
    "& .MuiDataGrid-row.Mui-selected": {
      backgroundColor: "#1a2742 !important",
    },
    "& .MuiDataGrid-row.Mui-selected:hover": {
      backgroundColor: "#213155 !important",
    },
    "& .MuiDataGrid-row.selected-true": {
      fontWeight: "bold",
      backgroundColor: "rgba(86, 44, 255, 0.1) !important",
    },
    "& .MuiDataGrid-virtualScroller": {
      overflowY: "auto !important",
    },
    "& .MuiDataGrid-footerContainer": {
      display: "none !important",
    },
  };

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

  useEffect(() => {
    setFooterActions(
      <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          color="error"
          sx={{
            maxWidth: "110px",
            minWidth: "110px",
            padding: "12px 35px",
            fontWeight: 700,
            fontSize: "14px",
            lineHeight: "17px",
          }}
          onClick={goToTourList}
        >
          Back
        </Button>
      </Box>
    );
    return () => setFooterActions(null);
  }, [goToTourList, setFooterActions]);

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
                ?.map((item2, i) => ({ ...item2, id: i, roundsArrId: i, roundId: item2.id || `round-${i}` }))
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
                  sx={{ paddingBottom: "10px" }}
                >
                  <h5>
                    {stageName.toUpperCase()} ({battle ? "BATTLE" : "NO-BATTLE"}
                    )
                  </h5>
                  {battle === false && (
                    <BaseDataGrid
                      className="rounds_table"
                      sx={roundsGridSx}
                      columns={columns}
                      rows={countedRows}
                      onRowClick={rowClickHandler}
                      hideFooter={true}
                      hideFooterPagination={true}
                      hideFooterSelectedRowCount={true}
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
                      className="rounds_table"
                      sx={roundsGridSx}
                      editMode="cell"
                      columns={battleDataGridColumns}
                      rows={countedRows}
                      onRowClick={rowClickHandler}
                      hideFooter={true}
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

        </Fragment>
      )}
      {!stages && (
        <Box
          sx={{
            minHeight: "320px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8e9ab8",
            fontSize: "18px",
          }}
        >
          Tournament data is not loaded yet
        </Box>
      )}
      <EditResultsBackDrop open={open} setOpen={setOpen} />
    </Container>
  );
};

export default TournamentsRounds;
