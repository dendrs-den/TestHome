import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import SpectatorSocket from "../Api_requests/SpectatorSocket";
import StopWatch from "../Components/SpectatorScreen/Timer/StopWatch";
import classes from "./SpectatorScreen.module.scss";
import formatTime from "../utils/formatTime";
import getInfo from "../Api_requests/roundState/getInfo";
import { Helmet } from "react-helmet";
import ico from "../images/infoscreen_logo3.png";
import { Box, Stack } from "@mui/material";
import CircularProgressDialog from "../Components/UI/Backdrop/CircularProgressDialog/CircularProgressDialog";
import { LastRound, Round } from "../types/general_types";
import PreviousRoundResult from "../Components/PreviousRoundResult/PreviousRoundResult";
import getCoreTime from "../Api_requests/getCoreTime";
import CustomizedSnackbar from "./CustomizedSnackbar";
import lp from "../Api_requests/longpoll/longpoll";
import sendLongCross from "../Api_requests/longCross";
import { useNavigate } from "react-router-dom";
import getIp from "../Api_requests/rounds/getIp";
import getCurrentTournament from "../Api_requests/tournaments/getCurrentTournament";

const SpectatorsScreenPage = () => {
  const [lastRoundInfo, setLastRoundInfo] = useState<LastRound>(null);
  const [timeDifference, setTimeDifference] = useState<number>();
  const [dataLoading, setDataLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(true);
  const [bustCount, setBustCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [faultCount, setFaultCount] = useState(0);
  const [stopWatchActive, setStopWatchActive] = useState(false);
  const [stopWatchReset, setStopWatchReset] = useState(false);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [roundInfo, setRoundInfo] = useState<Round>();
  const [resultTime, setResultTime] = useState(null);
  const [factTime, setFactTime] = useState(null);
  const [currentState, setCurrentState] = useState("");
  const [firstCrossTime, setFirstCrossTime] = useState(0);
  const [showLongCrossNote, setLongCrossNote] = useState(false);
  const [ipList, setIpList] = useState([]);
  const [showPreviousBattleResult, setShowPreviousBattleResult] = useState(false);
  const currentStateRef = useRef("");
  const stopWatchActiveRef = useRef(false);
  const navigate = useNavigate();
  const isTrainingMode = Boolean(currentTournament?.is_traning);

  const updatePreviousBattleResult = useCallback(
    async (targetRound?: Round) => {
      try {
      if (!targetRound?.stage?.battle) {
        setShowPreviousBattleResult(false);
        setLastRoundInfo(null);
        return;
      }

      const currentTour = await getCurrentTournament();
      const rounds = Array.isArray(currentTour?.round) ? currentTour.round : [];
      const stageRounds = rounds.filter(
        (round) => round?.stage?.id === targetRound?.stage?.id
      );
      const currentIndex = stageRounds.findIndex(
        (round) => round?.team?.id === targetRound?.team?.id
      );

      // First participant in stage should not see previous result block.
      if (currentIndex <= 0) {
        setShowPreviousBattleResult(false);
        setLastRoundInfo(null);
        return;
      }

      const previousRound = stageRounds[currentIndex - 1];
      const previousResultTime =
        Number(previousRound?.time_result) > 0
          ? Number(previousRound?.time_result)
          : Number(previousRound?.time_real);
      if (!Number.isFinite(previousResultTime) || previousResultTime < 0) {
        setShowPreviousBattleResult(false);
        setLastRoundInfo(null);
        return;
      }

      setShowPreviousBattleResult(true);
      setLastRoundInfo({
        team: previousRound?.team || null,
        time_result: previousResultTime,
        crossings: previousRound?.crossings || [],
        faults: previousRound?.faults || [],
        round_start: previousRound?.round_start || 0,
        stage_rank: previousRound?.stage_rank || 0,
        time_real: previousRound?.time_real || 0,
      });
      } catch (error) {
        console.log("Failed to calculate previous battle result", error);
        setShowPreviousBattleResult(false);
        setLastRoundInfo(null);
      }
    },
    []
  );

  const onFirstLoad = async () => {
    const fetchedData = await getInfo();
    console.log(fetchedData);

    setCurrentTournament(fetchedData?.tournament);
    setCurrentState(fetchedData?.state);

    if (!fetchedData?.tournament?.is_traning) {
      setRoundInfo(fetchedData?.round);
    }

    if (fetchedData?.round?.stage?.battle) {
      await updatePreviousBattleResult(fetchedData?.round);
    } else {
      setShowPreviousBattleResult(false);
      setLastRoundInfo(null);
    }

    if (["Expectation", "Performance", "Completion"].includes(fetchedData?.state)) {
      setIsPreparing(false);
    }
    if (
      ["Performance", "Completion"].includes(fetchedData?.state) ||
      (fetchedData?.state === "Preparation" && fetchedData?.tournament?.is_traning)
    ) {
      const validFaults = fetchedData?.round?.faults?.filter(
        (fault) => fault.valid === true || 0
      );

      setFaultCount(validFaults?.length || 0);
      setBustCount(
        validFaults?.filter((fault) => fault.type === "bust").length || 0
      );
      setSkipCount(
        validFaults?.filter((fault) => fault.type === "skip").length || 0
      );
    }
    if (
      ["Completion"].includes(fetchedData?.state) ||
      (["Preparation"].includes(fetchedData?.state) &&
        fetchedData?.tournament?.is_traning)
    ) {
      setFactTime(fetchedData?.round?.time_real);
      setResultTime(fetchedData?.round?.time_result);
    }

    // Turn on stopwatch immediately after reloading page if round is active
    if (["Performance"].includes(fetchedData?.state)) {
      setStopWatchActive(true);
      if (fetchedData?.round?.round_start) {
        setFirstCrossTime(fetchedData.round.round_start);
      }
    }

    setDataLoading(false);
    const { time } = await getCoreTime();
    const myTime = Date.now();
    setTimeDifference(myTime - time);
  };

  const loadRelevantData = useCallback(async () => {
    const fetchedData = await getInfo();
    console.log("relevant data", fetchedData);
    const nextState = fetchedData?.state;

    const validFaults = fetchedData?.round?.faults?.filter(
      (fault) => fault.valid === true
    );
    setFaultCount(validFaults?.length || 0);
    setBustCount(
      validFaults?.filter((fault) => fault.type === "bust").length || 0
    );
    setSkipCount(
      validFaults?.filter((fault) => fault.type === "skip").length || 0
    );
    // Do not overwrite running stopwatch during active round.
    if (
      ["Completion"].includes(nextState) ||
      (["Preparation"].includes(nextState) && fetchedData?.tournament?.is_traning)
    ) {
      setFactTime(fetchedData?.round?.time_real || 0);
      setResultTime(fetchedData?.round?.time_result || 0);
    } else {
      setFactTime(0);
      setResultTime(0);
    }

    setCurrentTournament(fetchedData?.tournament);
    setRoundInfo(fetchedData?.round);
    setCurrentState(nextState);

    if (fetchedData?.round?.stage?.battle) {
      await updatePreviousBattleResult(fetchedData?.round);
    } else {
      setShowPreviousBattleResult(false);
      setLastRoundInfo(null);
    }
  }, [updatePreviousBattleResult]);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) return;
  }, []);

  useEffect(() => {
    onFirstLoad();
  }, []);

  const fetchIpData = useCallback(async () => {
    const response = await getIp();
    const results = response?.results || [];
    setIpList(results);
  }, []);

  useEffect(() => {
    fetchIpData();
  }, [])

  useEffect(() => {
    const { socket } = SpectatorSocket.getInstance();

    const onCurrentTournament = (data) => {
      setCurrentTournament(data);
    };

    const onBust = () => {
      setBustCount((prev) => prev + 1);
      setFaultCount((prev) => prev + 1);
    };
    const onSkip = () => {
      setSkipCount((prev) => prev + 1);
      setFaultCount((prev) => prev + 1);
    };

    const onStateAdministration = () => {
      setStopWatchActive(false);
      setLongCrossNote(false);

      setCurrentState("Administration");
    };

    const onSetTraining = () => {
      loadRelevantData();
    };

    const onStatePrepare = () => {
      setIsPreparing(true);
      setLongCrossNote(false);
      setCurrentState("Preparation");
      setStopWatchActive(false);
      setStopWatchReset(true);
      setFirstCrossTime(0);
      setFactTime(0);
      setResultTime(0);
      setBustCount(0);
      setSkipCount(0);
      setFaultCount(0);
      loadRelevantData();
    };
    const onStateStart = () => {
      setIsPreparing(false);
      setCurrentState("Expectation");
      setStopWatchActive(false);
      setStopWatchReset(true);
      setFirstCrossTime(0);
      setFactTime(0);
      setResultTime(0);
      setFaultCount(0);
      setBustCount(0);
      setSkipCount(0);
    };
    const onStopwatchStart = () => {
      console.log("stopWatch started");
      setStopWatchActive(true);
      setStopWatchReset(false);
      const startTs = Date.now() - (timeDifference || 0);
      setFirstCrossTime((prev) => (prev && prev > 0 ? prev : startTs));
      localStorage.setItem("starting_time", String(startTs));
    };
    const onStateStop = ({ result }: any) => {
      console.log("set state STOP, received results:", result);
      setStopWatchActive(false);
      setCurrentState("Completion");
      if (result) {
        setFactTime(result?.fact_time);
        setResultTime(result?.result_time);
      }
      loadRelevantData();
    };

    const onStopWithError = () => {
      console.log("stop With Error");
      setStopWatchActive(false);
      setStopWatchReset(true);
      setIsPreparing(true);
      setCurrentState("Preparation");
      setFactTime(0);
      setResultTime(0);
      setBustCount(0);
      setSkipCount(0);
      setFaultCount(0);
      setFirstCrossTime(0);
    };

    const onNextRound = async () => {
      const info = await getInfo();
      setIsPreparing(true);
      setCurrentState(info.state);
      setStopWatchActive(false);
      setStopWatchReset(true);
      setFirstCrossTime(0);

      if (!info?.tournament?.is_traning) {
        setResultTime(0);
        setFactTime(0);
        setBustCount(0);
        setSkipCount(0);
        setFaultCount(0);
      }

      if (info && info.tournament && info.round) {
        setRoundInfo(info.round);
        if (info?.tournament?.is_traning) {
          setResultTime(info.round.time_result);
          setFactTime(info.round.time_real);
          setCurrentTournament(info.tournament);
        }
        if (info.round.stage.battle) {
          await updatePreviousBattleResult(info.round);
        } else {
          setShowPreviousBattleResult(false);
          setLastRoundInfo(null);
        }
      }
    };

    const onAllParamsOk = () => {
      console.log("all_params_ok");
    };

    const onGetInfo = () => {
      if (
        currentStateRef.current === "Performance" &&
        stopWatchActiveRef.current
      ) {
        return;
      }
      loadRelevantData();
    };

    const onBluetoothFault = (fault) => {
      if (fault.valid === true) {
        if (fault.type === "bust") {
          setBustCount((prevCount) => prevCount + 1);
          setFaultCount((prev) => prev + 1);
        } else {
          if (fault.type === "skip") {
            setSkipCount((prevCount) => prevCount + 1);
            setFaultCount((prev) => prev + 1);
          }
        }
      }
    };

    const onLastRound = (round_data) => {
      console.log(round_data);
    };

    socket.on("current_tournament", onCurrentTournament);
    socket.on("bust", onBust);
    socket.on("skip", onSkip);
    socket.on("stateAdministration", onStateAdministration);
    socket.on("set_training", onSetTraining);
    socket.on("statePrepare", onStatePrepare);
    socket.on("stateStart", onStateStart);
    socket.on("stopWatch_start", onStopwatchStart);
    socket.on("stateStop", onStateStop);
    socket.on("stopWithError", onStopWithError);
    socket.on("nextRound", onNextRound);
    socket.on("all_params_ok", onAllParamsOk);
    socket.on("getInfo", onGetInfo);
    socket.on("bluetooth_fault", onBluetoothFault);
    socket.on("last_round", onLastRound);

    return () => {
      socket.off("current_tournament", onCurrentTournament);
      socket.off("bust", onBust);
      socket.off("skip", onSkip);
      socket.off("stateAdministration", onStateAdministration);
      socket.off("set_training", onSetTraining);
      socket.off("statePrepare", onStatePrepare);
      socket.off("stateStart", onStateStart);
      socket.off("stopWatch_start", onStopwatchStart);
      socket.off("stateStop", onStateStop);
      socket.off("stopWithError", onStopWithError);
      socket.off("nextRound", onNextRound);
      socket.off("all_params_ok", onAllParamsOk);
      socket.off("getInfo", onGetInfo);
      socket.off("bluetooth_fault", onBluetoothFault);
      socket.off("last_round", onLastRound);
    };
  }, [loadRelevantData, timeDifference, updatePreviousBattleResult]);

  useEffect(() => {
    console.log("Subscribing");

    lp.Subscribe(
      "SensorFailure",
      async (data) => {
        setLongCrossNote(true);
        console.log("got long cross", data);
        setStopWatchActive(false);
        setStopWatchReset(true);
        setIsPreparing(true);
        setCurrentState("Preparation");
        setFactTime(0);
        setResultTime(0);
        setBustCount(0);
        setSkipCount(0);
        setFaultCount(0);
        setTimeout(() => {
          setLongCrossNote(false);
        }, 10010);
        await sendLongCross();
      },
      "467"
    );
  }, []);

  useEffect(() => {
    if (currentState) {
      console.log(currentState);
    }
    currentStateRef.current = currentState;
  }, [currentState]);

  useEffect(() => {
    stopWatchActiveRef.current = stopWatchActive;
  }, [stopWatchActive]);
  return (
    <React.Fragment>
      <Helmet>
        <title>InFlight infoboard</title>
      </Helmet>
      <Fragment>
        {!dataLoading && (
          <Box
            position="relative"
            width="100%"
            minHeight="100vh"
            padding="42px 78px"
            className={`${classes["background"]} ${classes[`background--${currentState}`]
              }`}
          >
            {["Preparation", "Expectation", "Performance"].includes(
              currentState
            ) &&
              Math.abs(timeDifference) > 4000 && (
                <Box display="flex">
                  <CustomizedSnackbar
                    severity="warning"
                    message="Time difference is too high! Timer values on different devices may not coincide"
                  />
                </Box>
              )}
            {/* Refactor ffs */}
            {["Preparation", "Expectation", "Performance"].includes(
              currentState
            ) &&
              showLongCrossNote && (
                <Box display="flex">
                  <CustomizedSnackbar
                    severity="error"
                    message="Last cross took to much time. Please check cross detector"
                    autoHide={10000}
                  />
                </Box>
              )}

            {currentState !== "Administration" && (
              <Box>
                <div className={classes.logo}>
                  <img src={ico} alt="logo"></img>
                </div>

                <Box className={classes["upper-row"]}>
                  <h3>
                    {(["Performance", "Expectation", "Completion"].includes(
                      currentState
                    ) ||
                      isPreparing) && (
                        <Box
                          marginBottom="35px"
                          className={classes["stage-disc-name"]}
                        >
                          {/* {currentTournament && !currentTournament.is_traning && (
                          <>
                            <span>
                              {currentTournament?.disciplines[0]?.name}
                            </span>
                            {currentTournament.stage &&
                              currentTournament.disciplines[0] && (
                                <span className={classes.divider}> | </span>
                              )}
                            <span>{currentTournament?.stage?.name}</span>
                          </>
                        )} */}
                          {roundInfo && !isTrainingMode && (
                            <>
                              <span>
                                {currentTournament?.disciplines?.[0]?.name}
                              </span>
                              {roundInfo.stage &&
                                currentTournament?.disciplines?.[0] && (
                                  <span className={classes.divider}> | </span>
                                )}
                              <span>{roundInfo?.stage?.name}</span>
                            </>
                          )}
                        </Box>
                      )}
                  </h3>
                  <h3 className={classes["tournament-name"]}>
                    {currentTournament?.name}
                  </h3>
                </Box>

                <Box
                  className={classes["prepare_status"]}
                  visibility={
                    ["Expectation", "Preparation"].includes(currentState) ||
                      isPreparing
                      ? "visible"
                      : "hidden"
                  }
                >
                  {(currentState === "Preparation" || isPreparing) &&
                    "PREPARE..."}
                  {currentState === "Expectation" &&
                    !stopWatchActive &&
                    "wait cross..."}
                </Box>

                {(["Performance", "Expectation", "Completion"].includes(
                  currentState
                ) ||
                  isPreparing) && (
                    <Box
                      component="section"
                      className={classes["main-info-block"]}
                    >
                      {/* Team name and number */}

                      {roundInfo && !isTrainingMode && (
                        <h4 className={classes["team-name"]}>
                          {roundInfo?.team?.name}#{roundInfo?.team?.number}
                        </h4>
                      )}

                      {(["Performance", "Expectation", "Completion"].includes(
                        currentState
                      ) ||
                        (["Preparation"].includes(currentState) &&
                          isTrainingMode)) && (
                          // Running Timer (fake, not real time) will be replaced at the end
                          // of the round with actual time (clean, not affected by faults)
                          <Box className={classes["timer-score-row"]}>
                            <Box className={classes["stopWatch__container"]}>
                              {factTime ? (
                                <Box>{formatTime(factTime).fullTime()}</Box>
                              ) : (
                                <StopWatch
                                  isActive={stopWatchActive}
                                  isReset={stopWatchReset}
                                  firstCrossTime={firstCrossTime}
                                />
                              )}
                            </Box>
                            {(["Performance", "Completion"].includes(
                              currentState
                            ) ||
                              (isTrainingMode &&
                                currentState === "Preparation") ||
                              stopWatchActive) && (
                                <Box className={classes["score"]}>
                                  <div className={classes["fault-score-digital"]}>
                                    <div className={classes["busts"]}>
                                      Busts:{" "}
                                      <span className={classes["bust-count"]}>
                                        {bustCount}
                                      </span>
                                    </div>
                                    <div className={classes["busts"]}>
                                      Skips:{" "}
                                      <span className={classes["bust-count"]}>
                                        {skipCount}
                                      </span>
                                    </div>
                                  </div>

                                  <Box className={classes["fault-score-circle"]}>
                                    {[...Array(faultCount)].map((item, i) => {
                                      return (
                                        <span
                                          className={classes["bust-circle"]}
                                          key={i}
                                        ></span>
                                      );
                                    })}
                                  </Box>
                                </Box>
                              )}
                          </Box>
                        )}

                      {(["Performance", "Expectation", "Completion"].includes(
                        currentState
                      ) ||
                        (["Preparation"].includes(currentState) &&
                          isTrainingMode)) &&
                        Boolean(resultTime) && (
                          <Box className={classes["result-timer"]}>
                            {formatTime(resultTime).fullTime()}
                          </Box>
                        )}
                    </Box>
                  )}

                {/* Previous Battle round result */}
                {["Performance", "Expectation", "Completion"].includes(
                  currentState
                ) &&
                  showPreviousBattleResult &&
                  lastRoundInfo &&
                  roundInfo?.stage?.battle && (
                    <Box className={classes["previous-battle-result"]}>
                      <PreviousRoundResult roundInfo={lastRoundInfo} />
                    </Box>
                  )}
              </Box>
            )}
          </Box>
        )}

        <CircularProgressDialog open={dataLoading} />
      </Fragment>
    </React.Fragment>
  );
};

export default SpectatorsScreenPage;
