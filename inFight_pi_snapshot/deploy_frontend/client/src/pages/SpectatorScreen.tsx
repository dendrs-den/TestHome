import React, { Fragment, useCallback, useEffect, useState } from "react";
import SpectatorSocket from "../Api_requests/SpectatorSocket";
import getLastRound from "../Api_requests/getLastRound";
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
  const navigate = useNavigate();

  const onFirstLoad = async () => {
    const fetchedData = await getInfo();
    console.log(fetchedData);

    setCurrentTournament(fetchedData?.tournament);
    setCurrentState(fetchedData?.state);

    if (!fetchedData?.tournament?.is_traning) {
      setRoundInfo(fetchedData?.round);
    }

    if (fetchedData?.round?.stage?.battle) {
      loadLastBattleRound();
    }

    if (
      ["Expectation", "Performance", "Completion"].includes(fetchedData.state)
    ) {
      setIsPreparing(false);
    }
    if (
      ["Performance", "Completion"].includes(fetchedData.state) ||
      (fetchedData.state === "Preparation" && fetchedData.tournament.is_traning)
    ) {
      const validFaults = fetchedData.round.faults?.filter(
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
      ["Completion"].includes(fetchedData.state) ||
      (["Preparation"].includes(fetchedData.state) &&
        fetchedData.tournament.is_traning)
    ) {
      setFactTime(fetchedData.round.time_real);
      setResultTime(fetchedData.round.time_result);
    }

    // Turn on stopwatch immediately after reloading page if round is active
    if (["Performance"].includes(fetchedData.state)) {
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
    setFactTime(fetchedData?.round?.time_real);
    setResultTime(fetchedData?.round?.time_result);

    setCurrentTournament(fetchedData?.tournament);
    setRoundInfo(fetchedData?.round);
    setCurrentState(fetchedData?.state);

    if (fetchedData?.round?.stage?.battle) {
      await loadLastBattleRound();
    }
  }, []);

  const loadLastBattleRound = useCallback(async () => {
    const lastRound = await getLastRound();

    if (lastRound) {
      setLastRoundInfo(lastRound);
    }
  }, []);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    onFirstLoad();
  }, []);

  const fetchIpData = useCallback(async () => {
    const { results } = await getIp();

    setIpList(results);
  }, []);

  useEffect(() => {
    fetchIpData();
  }, [])

  useEffect(() => {
    const { socket } = SpectatorSocket.getInstance();

    socket.on("current_tournament", (data) => {
      setCurrentTournament(data);
    });

    socket.on("bust", (info) => {
      setBustCount((prev) => prev + 1);
      setFaultCount((prev) => prev + 1);
    });
    socket.on("skip", (info) => {
      setSkipCount((prev) => prev + 1);
      setFaultCount((prev) => prev + 1);
    });

    socket.on("stateAdministration", () => {
      setStopWatchActive(false);
      setLongCrossNote(false);

      setCurrentState("Administration");
    });

    socket.on("set_training", () => {
      loadRelevantData();
    });

    socket.on("statePrepare", () => {
      setIsPreparing(true);
      setLongCrossNote(false);
      setCurrentState("Preparation");
      loadRelevantData();
    });
    socket.on("stateStart", () => {
      setIsPreparing(false);
      setCurrentState("Expectation");
      setFactTime(0);
      setResultTime(0);
      setFaultCount(0);
      setBustCount(0);
      setSkipCount(0);
    });
    socket.on("stopWatch_start", () => {
      console.log("stopWatch started");
      setStopWatchActive(true);
      setStopWatchReset(false);

      localStorage.setItem("starting_time", String(Date.now()));
    });
    socket.on("stateStop", ({ result }: any) => {
      console.log("set state STOP, received results:", result);
      setStopWatchActive(false);
      setCurrentState("Completion");
      if (result) {
        setFactTime(result?.fact_time);
        setResultTime(result?.result_time);
      }
      loadRelevantData();
    });

    socket.on("stopWithError", () => {
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
    });

    socket.on("nextRound", async () => {
      const info = await getInfo();
      setIsPreparing(true);
      setCurrentState(info.state);
      setStopWatchActive(false);
      setStopWatchReset(true);

      if (!info.tournament.is_traning) {
        setResultTime(0);
        setFactTime(0);
        setBustCount(0);
        setSkipCount(0);
        setFaultCount(0);
      }

      if (info && info.tournament && info.round) {
        setRoundInfo(info.round);
        if (info.tournament.is_traning) {
          setResultTime(info.round.time_result);
          setFactTime(info.round.time_real);
          setCurrentTournament(info.tournament);
        }
        if (info.round.stage.battle) {
          getLastRound();
        }
      }
    });

    socket.on("all_params_ok", () => {
      console.log("all_params_ok");
    });

    socket.on("getInfo", () => {
      loadRelevantData();
    });

    socket.on("bluetooth_fault", (fault) => {
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
    });

    socket.on("last_round", (round_data) => {
      console.log(round_data);
      setLastRoundInfo(round_data);
    });
  }, [loadRelevantData]);

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
  }, [currentState]);
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
                          {roundInfo && !currentTournament.is_traning && (
                            <>
                              <span>
                                {currentTournament?.disciplines[0]?.name}
                              </span>
                              {roundInfo.stage &&
                                currentTournament.disciplines[0] && (
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

                      {roundInfo && !currentTournament.is_traning && (
                        <h4 className={classes["team-name"]}>
                          {roundInfo?.team?.name}#{roundInfo?.team?.number}
                        </h4>
                      )}

                      {(["Performance", "Expectation", "Completion"].includes(
                        currentState
                      ) ||
                        (["Preparation"].includes(currentState) &&
                          currentTournament.is_traning)) && (
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
                              (currentTournament.is_traning &&
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
                          currentTournament.is_traning)) &&
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
                  lastRoundInfo &&
                  roundInfo?.stage?.battle && (
                    <Box position="absolute" bottom="42px" right="78px">
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
