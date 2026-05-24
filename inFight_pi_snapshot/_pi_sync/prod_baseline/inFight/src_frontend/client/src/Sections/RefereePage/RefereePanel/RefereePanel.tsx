import React, { useCallback, useEffect, useState } from "react";
import classes from "./RefereePanel.module.scss";
import { Box, Button, Chip, Typography } from "@mui/material";
import roundStartRemote from "../../../Api_requests/rounds/roundStartRemote";
import roundStartRemoteCross from "../../../Api_requests/rounds/roundStartRemoteCross";
import roundStopRemote from "../../../Api_requests/rounds/roundStopRemote";
import getCurrentRound from "../../../Api_requests/rounds/getCurrentRound";
import getCurrentTournament from "../../../Api_requests/tournaments/getCurrentTournament";
import EditResultsBackDrop from "../RoundUtilitiesBlock/EditResultsBackDrop/EditResultsBackDrop";
import SingleCrossBackDrop from "../../../Components/UI/Backdrop/SingleCrossBackDrop/SingleCrossBackDrop";
import LastRoundBackDrop from "../../../Components/UI/Backdrop/LastRoundBackDrop/LastRoundBackDrop";
import sendBust from "../../../Api_requests/roundState/sendBust";
import roundNext from "../../../Api_requests/rounds/roundNext";
import setPrepareState from "../../../Api_requests/roundState/setPrepareState";
import sendSkip from "../../../Api_requests/roundState/sendSkip";
import setAdministrationState from "../../../Api_requests/roundState/setAdministrationState";
import waitBluetoothFault from "../../../Api_requests/bluetooth/waitBluetoothFault";
import roundStart from "../../../Api_requests/rounds/roundStart";
import roundStop from "../../../Api_requests/rounds/roundStop";
import serviceActivate from "../../../Api_requests/service/serviceActivate";
import serviceCross from "../../../Api_requests/service/serviceCross";
import serviceStop from "../../../Api_requests/service/serviceStop";
import { Round } from "../../../types/general_types";
import getCrossRemote from "../../../Api_requests/getCrossRemote";
import getAllCrosses from "../../../Api_requests/getAllCrosses";
import SpectatorSocket from "../../../Api_requests/SpectatorSocket";
import CustomizedSnackbar from "../../../pages/CustomizedSnackbar";

type Props = {
  changeBlockTitle: (arg: string) => void;
  isTrainingMode: boolean;
  changeContent: (arg: string) => void;
};

let bustBlockInterval;
let skipBlockInterval;

const RefereePanel = (props: Props) => {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  const isServiceMode =
    process.env.REACT_APP_SERVICE_MODE === "1" || isLocalHost;
  const { changeBlockTitle, isTrainingMode, changeContent } = props;
  const { socket } = new SpectatorSocket();

  const [showLongCrossNote, setLongCrossNote] = useState<boolean>(false);
  const [crossCount, setCrossCount] = useState<number>(0);
  const [isActivatedRemotely, setActivatedRemotely] = useState<boolean>(false);
  const [roundInfo, setRoundInfo] = useState<Round>();
  const [tournamentInfo, setTournamentInfo] = useState(null);

  // =========ROUND STATES================================
  const [roundIsPreparing, setIsPreparing] = useState(true);
  const [isWaitingForCross, setIsWaitingForCross] = useState(false);
  const [roundIsActive, setRoundIsActive] = useState<boolean>(false);
  const [roundHasEnded, setRoundHasEnded] = useState<boolean>(false);
  const [alreadyStopped, setAlreadyStopped] = useState(false);
  // =====================================================

  // ===========BUTTON STATES================================
  const [activateBtnDisabled, setActivateBtnDisabled] = useState(false);
  const [nextRoundBtnDisabled, setNextRoundBtnDisabled] = useState(false);
  const [exitBtnDisabled, setExitBtnDisabled] = useState(false);
  const [stopBtnDisabled, setStopBtnDisabled] = useState(true);
  const [editResultBtnDisabled, setEditResultBtnDisabled] = useState(true);
  const [bustBtnDisabled, setBustBtnDisabled] = useState(true);
  const [skipBtnDisabled, setSkipBtnDisabled] = useState(true);

  // ======== BACKDROP PROPS============
  const [openSingleCrossWindow, setOpenSingleCross] = useState(false);
  const [errorText, setErrorText] = useState<string>();
  const [resultsWindowOpened, setResultsWindowOpened] = useState(false);
  const [lastRoundBackDropOpen, setLastRoundBackDropOpen] = useState(false);
  const [bluetoothFaultTime, setBluetoothFaultTime] = useState(0);

  const waitRemoteActivation = useCallback(async () => {
    const response = await roundStartRemote();

    console.log("remote activation response:", response);
    if (response) {
      setActivatedRemotely(true);
    }
  }, []);

  const waitCross = useCallback(async () => {
    try {
      const { cross_count } = await getCrossRemote();
      if (cross_count) {
        setCrossCount(cross_count);
      }
    } catch (err) {
      return;
    }
  }, [setCrossCount]);

  useEffect(() => {
    if (crossCount) {
      waitCross();
    }
    return () => {};
  }, [waitCross, crossCount]);

  // ============BLUETOOTH FAULTS LOGIC==================
  const waitBluetoothFaultTime = useCallback(async () => {
    const res = await waitBluetoothFault();

    if (res) {
      setBluetoothFaultTime(res.time);
    }
  }, [setBluetoothFaultTime]);

  useEffect(() => {
    if (bluetoothFaultTime) {
      waitBluetoothFaultTime();
    }

    return () => {};
  }, [bluetoothFaultTime, waitBluetoothFaultTime]);
  // ==================================================

  // ACTIVATE BUTTON EVENTs
  const activateButtonHandler = async () => {
    window.stop();
    setAlreadyStopped(false);
    setLongCrossNote(false);
    setIsPreparing(false);
    setIsWaitingForCross(true);
    console.log("awaiting for cross...");

    if (isServiceMode) {
      await serviceActivate();
      return;
    }

    const timeStamp = await roundStart();

    if (timeStamp) {
      setRoundIsActive(true);
      waitBluetoothFaultTime();
      setCrossCount(1);
    }
  };

  const emulateCrossHandler = () => {
    if (isServiceMode) {
      serviceCross();
    }
    if (isWaitingForCross && !roundIsActive) {
      setRoundIsActive(true);
      setCrossCount(1);
      return;
    }
    setCrossCount((prev) => prev + 1);
  };

  const activateRemotely = async () => {
    setAlreadyStopped(false);
    console.log("started remotely. awaiting for cross...");
    setIsWaitingForCross(true);
    const timeStamp = await roundStartRemoteCross();

    console.log("result of remote crossing: ", timeStamp);
    if (timeStamp?.cross) {
      setRoundIsActive(true);
      setCrossCount(1);
      waitBluetoothFaultTime();
    }
  };

  useEffect(() => {
    if (isActivatedRemotely) {
      activateRemotely();
      waitForRemoteStop();
    }
  }, [isActivatedRemotely]);

  // useEffect(() => {
  //   if (isActivatedRemotely) {
  //     waitForRemoteStop();
  //   }
  // }, [isActivatedRemotely]);

  // STOP BUTTON EVENT
  const stopButtonHandler = async () => {
    const stopResponse = isServiceMode ? await serviceStop() : await roundStop();
    if (!alreadyStopped) {
      window.stop();
      setAlreadyStopped(true);
    }
    clearInterval(skipBlockInterval);
    clearInterval(bustBlockInterval);
    setStopBtnDisabled(true);

    // if (stopResponse?.text?.status && !roundIsPreparing) {
    if (stopResponse?.text?.status) {
      if (stopResponse.text.status === "Round finalization is already in progress") {
        return;
      }
      setErrorText(stopResponse.text.status);
      toggleBackDrop(true);
      setIsPreparing(true);
    }

    if (stopResponse.result) {
      setRoundHasEnded(true);
      const receivedCrosses = await getAllCrosses();
      if (receivedCrosses) {
        setCrossCount(receivedCrosses.length);
      }
    }
  };

  const waitForRemoteStop = async () => {
    const response = await roundStopRemote();

    if (!alreadyStopped) {
      window.stop();
      setAlreadyStopped(true);
    }

    clearInterval(skipBlockInterval);
    clearInterval(bustBlockInterval);

    // if (response.status) {
    if (response.status) {
      setErrorText(response.status);
      toggleBackDrop(true);
      setIsPreparing(true);
    }

    // somehow roundIsActive here is false. need to find the reason
    // if (roundIsActive && response.result) {
    if (response.result) {
      setRoundHasEnded(true);
      const receivedCrosses = await getAllCrosses();
      if (receivedCrosses) {
        setCrossCount(receivedCrosses.length);
      }
    }
  };

  const bustButtonHandler = useCallback(async () => {
    clearInterval(bustBlockInterval);
    setBustBtnDisabled(true);
    bustBlockInterval = setInterval(() => {
      setBustBtnDisabled(false);
    }, 1000);
    await sendBust();
  }, []);

  const skipButtonHandler = useCallback(async () => {
    clearInterval(skipBlockInterval);
    setSkipBtnDisabled(true);
    skipBlockInterval = setInterval(() => {
      setSkipBtnDisabled(false);
    }, 1000);
    await sendSkip();
  }, []);

  // START NEW ROUND EVENT
  const startNextRound = async () => {
    window.stop();

    const res = await roundNext();
    // if it was the last round , show backdrop
    if (res?.status && res?.status === "All rounds are played") {
      setLastRoundBackDropOpen(true);
    } else {
      await fetchRoundData();
      await setPrepareState();
      setIsPreparing(true);
    }
    setCrossCount(0);
  };

  const toggleBackDrop = (show: boolean) => {
    setOpenSingleCross(show);
  };

  const fetchCurrentTour = useCallback(async () => {
    const tour = await getCurrentTournament();
    setTournamentInfo(tour);
    changeBlockTitle(tour?.name);
  }, [changeBlockTitle]);

  const fetchRoundData = useCallback(async () => {
    const data = await getCurrentRound();

    setRoundInfo(data);
  }, []);

  useEffect(() => {
    fetchRoundData();
  }, [fetchRoundData]);

  useEffect(() => {
    fetchCurrentTour();
  }, [fetchCurrentTour]);

  useEffect(() => {
    if (!isServiceMode) return;
    setPrepareState();
    setIsPreparing(true);
  }, [isServiceMode]);

  // GO BACK TO SELECTING ROUNDS
  const exitButtonHandler = async () => {
    window.stop();
    await setAdministrationState();
    changeContent("tournamentsRounds");
  };

  // ===================useEffects========================

  // ====== BLUETOOTH ACTIVATE AND CROSS LOGIC ===========

  useEffect(() => {
    if (isWaitingForCross) {
      setIsPreparing(false);
      setActivateBtnDisabled(true);
      setNextRoundBtnDisabled(true);
      setExitBtnDisabled(true);
      setStopBtnDisabled(false);
      setEditResultBtnDisabled(true);
      setBustBtnDisabled(true);
      setSkipBtnDisabled(true);
    }
  }, [isWaitingForCross]);
  // entering 'active round state' and button state management
  useEffect(() => {
    if (roundIsActive) {
      setIsWaitingForCross(false);
      setExitBtnDisabled(true);
      setNextRoundBtnDisabled(true);
      setStopBtnDisabled(false);
      setEditResultBtnDisabled(true);
      setActivateBtnDisabled(true);
      setBustBtnDisabled(false);
      setSkipBtnDisabled(false);
    }
  }, [roundIsActive]);

  useEffect(() => {
    if (roundHasEnded) {
      setRoundIsActive(false);
      setExitBtnDisabled(false);
      setNextRoundBtnDisabled(false);
      setStopBtnDisabled(true);
      setEditResultBtnDisabled(false);
      setActivateBtnDisabled(true);
      setBustBtnDisabled(true);
      setSkipBtnDisabled(true);
      setActivatedRemotely(false);
    }
  }, [roundHasEnded]);

  useEffect(() => {
    if (roundIsPreparing && !isServiceMode) {
      setTimeout(() => {
        waitRemoteActivation();
      }, 300);
    }
  }, [roundIsPreparing, isServiceMode, waitRemoteActivation]);

  useEffect(() => {
    if (roundIsPreparing) {
      setRoundHasEnded(false);
      setRoundIsActive(false);
      setIsWaitingForCross(false);
      setExitBtnDisabled(false);
      setActivateBtnDisabled(false);
      setNextRoundBtnDisabled(false);
      setStopBtnDisabled(true);
      setEditResultBtnDisabled(true);
      clearInterval(skipBlockInterval);
      clearInterval(bustBlockInterval);
      setBustBtnDisabled(true);
      setSkipBtnDisabled(true);
      setCrossCount(0);
      setActivatedRemotely(false);
    }
  }, [roundIsPreparing]);

  useEffect(() => {
    socket.on("longCross", (data) => {
      console.log("got long cross", data);
      setLongCrossNote(true);
      setIsPreparing(true);
    });
  }, []);

  return (
    <Box className={classes["controlPanel"]}>
      {crossCount > 0 && (
        <Box display="flex" color="#000" justifyContent="end">
          <Typography
            component="div"
            fontSize="20px"
            color="#5c5c5c"
            fontWeight="600"
          >
            Crosses: {crossCount}
          </Typography>
        </Box>
      )}
      {isServiceMode && (
        <Box display="flex" justifyContent="end" mb="10px">
          <Button
            variant="outlined"
            disabled={!isWaitingForCross && !roundIsActive}
            onClick={emulateCrossHandler}
            sx={{
              borderColor: "#dd403a",
              color: "#dd403a",
              borderWidth: "4px",
              borderRadius: "16px",
              minWidth: "130px",
              height: "44px",
              fontWeight: 700,
              "&:hover": {
                borderColor: "#a6312d",
                color: "#a6312d",
                backgroundColor: "hsl(3, 100%, 97%)",
              },
            }}
          >
            SENSOR CROSS
          </Button>
        </Box>
      )}

      <Typography
        variant="h5"
        component="h5"
        fontWeight="bold"
        m="0 0 20px 0"
        className={classes["controlPanel__header"]}
      >
        Referee Panel
      </Typography>

      <Box>
        {tournamentInfo && roundInfo && !isTrainingMode && (
          <Box display="flex" justifyContent="space-between" gap="40px">
            <Box
              display="flex"
              flexDirection="column"
              flex=".5"
              gap="8px"
              justifyContent="space-between"
              sx={{
                "& *": {
                  fontSize: "20px",
                },
              }}
            >
              <Box display="flex" justifyContent="space-between">
                <Box>Stage: </Box>
                <Box justifySelf="flex-end">
                  <Chip variant="info" label={roundInfo.stage?.name} />
                </Box>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Box>Team:</Box>{" "}
                <Box>
                  <Chip variant="info" label={roundInfo.team?.name} />
                </Box>
                {}
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Box>Discipline: </Box>
                <Box>
                  <Chip
                    variant="info"
                    label={tournamentInfo?.disciplines[0]?.name}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <React.Fragment>
          <Box
            marginTop="30px"
            display="flex"
            flexDirection="column"
            gap="20px"
          >
            <Button
              disabled={nextRoundBtnDisabled}
              className={classes["btn-newRound"]}
              variant="outlined"
              onClick={startNextRound}
            >
              Next Round
            </Button>

            <Box className={classes["controls"]}>
              {/* ACTIVATE */}
              <Button
                disabled={activateBtnDisabled}
                className={`${classes["controls__btn"]} ${classes["activate-btn"]}`}
                variant="outlined"
                onClick={activateButtonHandler}
              >
                Activate
              </Button>

              {/* STOP */}
              <Button
                disabled={stopBtnDisabled}
                className={`${classes["controls__btn"]} ${classes["stop-btn"]}`}
                variant="outlined"
                onClick={stopButtonHandler}
              >
                Stop
              </Button>

              {/* ADD BUST */}
              <Button
                disabled={bustBtnDisabled}
                className={`${classes["controls__btn"]} ${classes["bust-btn"]}`}
                variant="contained"
                onClick={bustButtonHandler}
              >
                Bust
              </Button>

              {/* ADD SKIP */}
              <Button
                disabled={skipBtnDisabled}
                className={`${classes["controls__btn"]} ${classes["skip-btn"]}`}
                variant="contained"
                onClick={skipButtonHandler}
              >
                Skip
              </Button>
            </Box>
          </Box>

          {/* UTILITIES */}
          <Box
            marginTop="20px"
            display="flex"
            justifyContent="flex-end"
            gap="20px"
          >
            <Button
              sx={{
                padding: "10px 30px",
              }}
              disabled={exitBtnDisabled}
              variant="outlined"
              color="error"
              onClick={exitButtonHandler}
            >
              Exit
            </Button>
            <Button
              disabled={editResultBtnDisabled}
              sx={{
                backgroundColor: "#562cff",
                "&:hover": {
                  backgroundColor: "#2900cc",
                },
              }}
              className={classes["btn-edit"]}
              variant="contained"
              onClick={() => setResultsWindowOpened(true)}
            >
              Edit results
            </Button>
          </Box>
        </React.Fragment>

        <EditResultsBackDrop
          open={resultsWindowOpened}
          setOpen={setResultsWindowOpened}
        />
        <LastRoundBackDrop
          open={lastRoundBackDropOpen}
          onClick={async () => {
            window.stop();
            await setAdministrationState();
            changeContent("tournamentsRounds");
          }}
        />

        <SingleCrossBackDrop
          open={openSingleCrossWindow}
          onClick={() => {
            setOpenSingleCross(false);
          }}
          errorText={errorText}
        />
      </Box>

      {showLongCrossNote && (
        <Box display="flex">
          <CustomizedSnackbar
            severity="error"
            message="Last cross took to much time. Please check cross detector"
            autoHide={10000}
          />
        </Box>
      )}
    </Box>
  );
};

export default RefereePanel;
