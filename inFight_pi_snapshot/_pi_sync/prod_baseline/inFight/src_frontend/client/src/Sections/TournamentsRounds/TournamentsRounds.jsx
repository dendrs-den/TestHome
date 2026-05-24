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

const MIN_BATTLE_SLOTS = 2;
const BATTLE_SLOTS_KEY_PREFIX = "infight_battle_slots_";

const getBattleSlotsStorageKey = (tourId) =>
  `${BATTLE_SLOTS_KEY_PREFIX}${tourId || "unknown"}`;

const buildRoundsFromTournament = (tour) => {
  const teams = Array.isArray(tour?.teams) ? tour.teams : [];
  const stages = Array.isArray(tour?.stages) ? tour.stages : [];
  if (!teams.length || !stages.length) return [];

  const rounds = [];
  for (const stage of stages) {
    for (const team of teams) {
      rounds.push({
        ...defaultTeam,
        team,
        stage,
      });
    }
  }
  return rounds;
};

function EditToolbar(props) {
  const { onAddSlot, canAddSlot } = props;

  const addNewRound = async () => {
    await onAddSlot();
  };
  return (
    <GridToolbarContainer sx={{ justifyContent: "end", paddingTop: "15px" }}>
      <Button
        disabled={!canAddSlot}
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
  const [currentTour, setCurrentTour] = useState({
    teams: [],
    stages: [],
    round: [],
  });
  const [rowData, setRowData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(0);
  const [open, setOpen] = useState(false);
  const [battleVisibleSlots, setBattleVisibleSlots] = useState({});

  const startRound = useCallback(
    async (roundId) => {
      await setCurrentRound(roundId);
      changeContent("refereePanel");
    },
    [changeContent]
  );

  const handleRowModelChange = async (params) => {
    const rowKey = Object.keys(params)[0];
    const teamId = params[rowKey]?.name?.value;
    const roundIndex = Number(rowKey);

    // Accept index 0 as valid and ensure we send numeric index.
    if (Number.isInteger(roundIndex) && roundIndex >= 0 && teamId && teamId.length > 20) {
      await roundUpdateTeam(roundIndex, teamId);
      await fetchCurrentTournament();
    }
  };

  const fetchCurrentTournament = useCallback(async () => {
    const currentTour = await getCurrentTournament();
    const normalizedRounds =
      Array.isArray(currentTour?.round) && currentTour.round.length > 0
        ? currentTour.round
        : buildRoundsFromTournament(currentTour);
    const normalizedTour = {
      teams: currentTour?.teams || [],
      stages: currentTour?.stages || [],
      round: normalizedRounds,
      ...currentTour,
    };
    setCurrentTour(normalizedTour);
    setRowData(normalizedTour.round);
    let storedSlots = {};
    try {
      const raw = localStorage.getItem(getBattleSlotsStorageKey(normalizedTour.id));
      storedSlots = raw ? JSON.parse(raw) : {};
    } catch (_) {
      storedSlots = {};
    }
    const nextBattleVisible = {};
    (normalizedTour?.stages || [])
      .filter((stage) => stage?.battle)
      .forEach((stage) => {
        const stageRows = (normalizedTour?.round || []).filter(
          (round) => round?.stage?.id === stage.id
        );
        const rowsWithData = stageRows.filter(
          (round) =>
            round?.team ||
            (Array.isArray(round?.crossings) && round.crossings.length > 0) ||
            (Array.isArray(round?.faults) && round.faults.length > 0) ||
            [null, undefined].includes(round?.time_real) === false ||
            [null, undefined].includes(round?.time_result) === false
        ).length;
        const fallbackVisible = Math.max(
          MIN_BATTLE_SLOTS,
          Math.min(stageRows.length, rowsWithData)
        );
        const storedVisible = Number(storedSlots?.[stage.id]);
        nextBattleVisible[stage.id] =
          Number.isInteger(storedVisible) && storedVisible >= MIN_BATTLE_SLOTS
            ? Math.min(stageRows.length, storedVisible)
            : fallbackVisible;
      });
    setBattleVisibleSlots(nextBattleVisible);
    changeBlockTitle(normalizedTour?.name || "Tournaments");
  }, [changeBlockTitle]);

  const showBackDrop = useCallback(async (roundId) => {
    await setCurrentRound(roundId);

    // #73425 - refactor is needed , we do not want to change state manually
    await setAdministrationState();
    setOpen(true);
  }, []);

  const deleteSelectedRound = useCallback(
    async (row) => {
      const hasResults =
        (Array.isArray(row.crossings) && row.crossings.length > 0) ||
        (Array.isArray(row.faults) && row.faults.length > 0) ||
        [null, undefined].includes(row.time_real) === false ||
        [null, undefined].includes(row.time_result) === false;
      if (hasResults) return;
      const stageRows = rowData
        .map((item, i) => ({ ...item, roundsArrId: i }))
        .filter((item) => item?.stage?.id === row.stageId);
      const visible = battleVisibleSlots[row.stageId] || MIN_BATTLE_SLOTS;
      if (visible <= MIN_BATTLE_SLOTS) return;

      const rowPos = stageRows.findIndex((r) => r.roundsArrId === row.roundsArrId);
      const lastVisiblePos = visible - 1;
      if (rowPos < 0 || rowPos >= visible) return;

      // Move selected row to the end of visible segment, then hide that segment tail.
      for (let i = rowPos; i < lastVisiblePos; i += 1) {
        const from = stageRows[i]?.roundsArrId;
        const to = stageRows[i + 1]?.roundsArrId;
        if ([from, to].every((v) => Number.isInteger(v))) {
          await swapTeamPositions(from, to);
        }
      }

      setBattleVisibleSlots((prev) => ({
        ...prev,
        [row.stageId]: Math.max(MIN_BATTLE_SLOTS, visible - 1),
      }));

      await fetchCurrentTournament();
    },
    [battleVisibleSlots, fetchCurrentTournament, rowData]
  );

  const addBattleSlot = useCallback(
    async (stageId, stageTotal) => {
      setBattleVisibleSlots((prev) => {
        const current = prev[stageId] || MIN_BATTLE_SLOTS;
        const next = Math.min(stageTotal, current + 1);
        return { ...prev, [stageId]: next };
      });
    },
    []
  );

  const columns = [
    {
      field: "counter",
      headerName: "#",
      maxWidth: 50,
      flex: 1,
    },
    {
      field: "number",
      headerName: "number",
      maxWidth: 100,
      flex: 1,
    },
    {
      field: "name",
      headerName: "name",
      maxWidth: 250,
      flex: 2,
    },
    {
      field: "rank",
      headerName: "rank",
      maxWidth: 100,
      flex: 1,
    },
    {
      field: "time",
      headerName: "time",
      maxWidth: 120,
      flex: 1.3,
    },
    {
      field: "bust",
      headerName: "Bust",
      maxWidth: 90,
      flex: 0.8,
    },
    {
      field: "skip",
      headerName: "Skip",
      maxWidth: 90,
      flex: 0.8,
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
        const hasResults =
          (Array.isArray(row.crossings) && row.crossings.length > 0) ||
          (Array.isArray(row.faults) && row.faults.length > 0) ||
          [null, undefined].includes(row.time_real) === false ||
          [null, undefined].includes(row.time_result) === false;
        return (
          row.id === selectedRow.teamId &&
          row.stageId === selectedRow.stageId &&
          row.stage.battle &&
          (battleVisibleSlots[row.stageId] || MIN_BATTLE_SLOTS) > MIN_BATTLE_SLOTS &&
          !hasResults && (
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
    fetchCurrentTournament();
  }, [fetchCurrentTournament]);

  useEffect(() => {
    if (open === false) {
      fetchCurrentTournament();
    }
  }, [open, fetchCurrentTournament]);

  useEffect(() => {
    if (!currentTour?.id) return;
    try {
      localStorage.setItem(
        getBattleSlotsStorageKey(currentTour.id),
        JSON.stringify(battleVisibleSlots)
      );
    } catch (_) {
      // Ignore storage write errors (private mode / quota).
    }
  }, [battleVisibleSlots, currentTour?.id]);

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
                ({ team, time_result, stage_rank, faults, ...rest }, j) => {
                  const validFaults = Array.isArray(faults)
                    ? faults.filter((fault) => fault?.valid !== false)
                    : [];
                  return {
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
                    bust: validFaults.filter((fault) => fault?.type === "bust")
                      .length,
                    skip: validFaults.filter((fault) => fault?.type === "skip")
                      .length,
                    stageId,
                  };
                }
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
                    <>
                    <Box
                      sx={{
                        color: "#6d6d6d",
                        fontSize: "12px",
                        px: 2,
                        pb: 1,
                      }}
                    >
                      Battle stage: minimum 2 slots. Delete is available only for rows without results.
                    </Box>
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
                      rows={countedRows.filter((row) => {
                        const maxVisible = battleVisibleSlots[stageId] || MIN_BATTLE_SLOTS;
                        return row.index < maxVisible;
                      })}
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
                          canAddSlot: (battleVisibleSlots[stageId] || MIN_BATTLE_SLOTS) < countedRows.length,
                          onAddSlot: () => addBattleSlot(stageId, countedRows.length),
                        },
                      }}
                      getRowClassName={({ row }) => {
                        return `selected-${
                          row.id === selectedRow.teamId &&
                          row.stageId === selectedRow.stageId
                        }`;
                      }}
                    />
                    </>
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
