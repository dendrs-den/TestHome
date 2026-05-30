import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
} from "@mui/material";
import { GridToolbarContainer } from "@mui/x-data-grid";
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

const hasSavedResult = (round) =>
  ![null, undefined].includes(round?.time_result) ||
  ![null, undefined].includes(round?.time_real);

const formatStageLabel = (stageName, battle) =>
  battle ? `${stageName} (battle)` : stageName;

const countFaultsByType = (faults, type) =>
  Array.isArray(faults)
    ? faults.filter((fault) => fault?.type === type && fault?.valid !== false).length
    : 0;

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
  const {
    changeContent,
    changeBlockTitle,
    setFooterActions,
    stageTabs = [],
    activeStageId,
    onActiveStageChange,
    onStageTabsChange,
  } = props;
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

  const syncActiveStage = useCallback(
    (stagesToSync, explicitActiveStageId) => {
      if (!Array.isArray(stagesToSync) || stagesToSync.length === 0) {
        onActiveStageChange?.(null);
        return null;
      }

      const existingIds = new Set(stagesToSync.map((stage) => stage?.id));
      if (explicitActiveStageId && existingIds.has(explicitActiveStageId)) {
        return explicitActiveStageId;
      }

      try {
        const raw = sessionStorage.getItem("legacyRefContext");
        if (raw) {
          const parsed = JSON.parse(raw);
          const focusedStageId = parsed?.returnFocus?.stageId;
          if (focusedStageId && existingIds.has(focusedStageId)) {
            onActiveStageChange?.(focusedStageId);
            return focusedStageId;
          }
        }
      } catch {}

      const fallbackStageId = stagesToSync[0]?.id ?? null;
      onActiveStageChange?.(fallbackStageId);
      return fallbackStageId;
    },
    [onActiveStageChange]
  );

  const focusRow = useCallback((row) => {
    setSelectedRow({ teamId: row.id, stageId: row.stageId });
  }, []);

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
    const normalizedStages = Array.isArray(normalizedTour?.stages)
      ? normalizedTour.stages
      : [];
    onStageTabsChange?.(normalizedStages);
    syncActiveStage(normalizedStages, activeStageId);
    changeBlockTitle(normalizedTour?.name || "Tournament");
  }, [
    buildDefaultRounds,
    changeBlockTitle,
    onStageTabsChange,
    syncActiveStage,
    activeStageId,
  ]);

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
      minWidth: 300,
      maxWidth: 320,
      flex: 2.4,
    },
    {
      field: "number",
      headerName: "Number",
      minWidth: 100,
      maxWidth: 110,
      flex: 0.9,
      align: "center",
      headerAlign: "center",
      cellClassName: "roundsCellMono",
    },
    {
      field: "resultTime",
      headerName: "Real time",
      minWidth: 124,
      maxWidth: 136,
      flex: 1,
      align: "center",
      headerAlign: "center",
      cellClassName: "roundsCellMono",
    },
    {
      field: "bust",
      headerName: "Bust",
      minWidth: 76,
      maxWidth: 84,
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      cellClassName: "roundsCellMono",
    },
    {
      field: "skip",
      headerName: "Skip",
      minWidth: 76,
      maxWidth: 84,
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      cellClassName: "roundsCellMono",
    },
    {
      field: "finalTime",
      headerName: "Final time",
      minWidth: 128,
      maxWidth: 142,
      flex: 1,
      align: "center",
      headerAlign: "center",
      cellClassName: "roundsCellMono",
    },
    {
      field: "rank",
      headerName: "Rank",
      minWidth: 76,
      maxWidth: 84,
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      cellClassName: "roundsCellMono",
    },
    {
      field: "actions",
      sortable: false,
      type: "actions",
      headerName: "Actions",
      minWidth: 332,
      maxWidth: 352,
      flex: 2.2,
      cellClassName: "actions",
      align: "center",
      headerAlign: "center",
      renderCell: ({ row }) => {
        const { roundsArrId } = row;
        const isSelected =
          row.id === selectedRow.teamId && row.stageId === selectedRow.stageId;

        return (
          <Box
            className={`round-actions ${isSelected ? "" : "round-actions--idle"}`}
            width={"100%"}
            onClick={() => focusRow(row)}
          >
            {isSelected ? (
              <>
              <Box className="round-actions__move">
                <IconButton
                  size="small"
                  className="round-actions__icon-btn"
                  disabled={row.index === row.totalCount - 1}
                  onClick={async () => {
                    focusRow(row);
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
                  size="small"
                  className="round-actions__icon-btn"
                  disabled={row.index === 0}
                  onClick={async () => {
                    focusRow(row);
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
              <Box className="round-actions__buttons">
                <Button
                  // disabled={row.name?.length > 20 || !row.name}
                  disabled={!row.name}
                  variant="outlined"
                  color="primary"
                  size="small"
                  className="round-actions__action-btn round-actions__action-btn--play"
                  onClick={() => {
                    focusRow(row);
                    startRound(roundsArrId, row);
                  }}
                >
                  {hasSavedResult(row) ? "Replay" : "Play"}
                </Button>
                {hasSavedResult(row) && (
                  <Button
                    onClick={() => {
                      focusRow(row);
                      showBackDrop(roundsArrId);
                    }}
                    variant="outlined"
                    color="primary"
                    size="small"
                    className="round-actions__action-btn round-actions__action-btn--edit"
                  >
                    Edit results
                  </Button>
                )}
              </Box>
              </>
            ) : null}
          </Box>
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
  const activeStage =
    (Array.isArray(stageTabs) &&
      stageTabs.find((stage) => stage?.id === activeStageId)) ||
    (Array.isArray(stages) &&
      stages.find((stage) => stage?.id === activeStageId)) ||
    (Array.isArray(stages) && stages.length ? stages[0] : null);
  const roundsGridSx = {
    height: "100%",
    "--DataGrid-bg": "#050b1a",
    "--DataGrid-containerBackground": "#141c2d",
    "--DataGrid-t-header-background-base": "#141c2d",
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: "#141c2d !important",
      borderBottom: "1px solid #2b3551 !important",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      color: "#dbe3ff !important",
      fontWeight: 700,
      fontSize: "16px",
      textTransform: "none",
    },
    "& .MuiDataGrid-cell.actions": {
      justifyContent: "center",
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
    if (!stageTabs?.length) return;
    if (activeStageId && stageTabs.some((stage) => stage?.id === activeStageId)) {
      return;
    }
    syncActiveStage(stageTabs, activeStageId);
  }, [stageTabs, activeStageId, syncActiveStage]);

  useEffect(() => {
    fetchCurrentTournament();
  }, [fetchCurrentTournament]);

  useEffect(() => {
    if (open === false) {
      fetchCurrentTournament();
    }
  }, [open, fetchCurrentTournament]);

  const rowClickHandler = ({ row }) => {
    focusRow(row);
  };

  const goToTourList = useCallback(() => {
    window.stop();
    changeBlockTitle("Tournaments");
    changeContent("tournamentsList");
  }, [changeBlockTitle, changeContent]);

  useEffect(() => {
    setFooterActions(null);
    return () => setFooterActions(null);
  }, [setFooterActions]);

  return (
    <Box className="rounds-page-shell">
      <Box className="rounds-page-card">
        <Box className="rounds-page-scroll">
          {activeStage && (
            <Fragment>
              <Grid className="rounds-stage-grid">
                {(() => {
                  const { id: stageId, name: stageName, battle } = activeStage;
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
                      resultTime: [null, undefined].includes(rest.time_real)
                        ? "-"
                        : formatTime(rest.time_real).fullTime(),
                      bust: countFaultsByType(rest.faults, "bust"),
                      skip: countFaultsByType(rest.faults, "skip"),
                      finalTime: [null, undefined].includes(time_result)
                        ? "-"
                        : formatTime(time_result).fullTime(),
                      rank: [null, undefined].includes(stage_rank)
                        ? "-"
                        : stage_rank,
                      stageId,
                    })
                  );
                  return (
                    <Box key={stageId} className="rounds-stage-card">
                      <h5 className="rounds-stage-title">
                        {formatStageLabel(stageName, battle)}
                      </h5>
                      {battle === false && (
                        <BaseDataGrid
                          className="rounds_table"
                          sx={roundsGridSx}
                          rowHeight={72}
                          columnHeaderHeight={56}
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
                          rowHeight={72}
                          columnHeaderHeight={56}
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
                })()}
              </Grid>
            </Fragment>
          )}
          {!activeStage && (
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
        </Box>
        <Box className="rounds-page-footer">
          <Button
            className="rounds-footer-btn"
            variant="outlined"
            color="inherit"
            onClick={goToTourList}
          >
            Back
          </Button>
        </Box>
      </Box>
      <EditResultsBackDrop open={open} setOpen={setOpen} />
    </Box>
  );
};

export default TournamentsRounds;
