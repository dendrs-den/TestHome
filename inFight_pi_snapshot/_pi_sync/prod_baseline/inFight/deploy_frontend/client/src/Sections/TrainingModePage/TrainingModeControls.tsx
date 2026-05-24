import { Box, Button, Typography } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import waitBluetoothFault from "../../Api_requests/bluetooth/waitBluetoothFault";
import getAllCrosses from "../../Api_requests/getAllCrosses";
import getCrossRemote from "../../Api_requests/getCrossRemote";
import roundStart from "../../Api_requests/rounds/roundStart";
import roundStartRemote from "../../Api_requests/rounds/roundStartRemote";
import roundStartRemoteCross from "../../Api_requests/rounds/roundStartRemoteCross";
import roundStop from "../../Api_requests/rounds/roundStop";
import roundStopRemote from "../../Api_requests/rounds/roundStopRemote";
import sendBust from "../../Api_requests/roundState/sendBust";
import sendSkip from "../../Api_requests/roundState/sendSkip";
import setPrepareState from "../../Api_requests/roundState/setPrepareState";
import SingleCrossBackDrop from "../../Components/UI/Backdrop/SingleCrossBackDrop/SingleCrossBackDrop";
import EditResultsBackDrop from "../RefereePage/RoundUtilitiesBlock/EditResultsBackDrop/EditResultsBackDrop";
import SpectatorSocket from "../../Api_requests/SpectatorSocket";
import CustomizedSnackbar from "../../pages/CustomizedSnackbar";

let bustBlockInterval;
let skipBlockInterval;

const TrainingModeControls = (props) => {
  const { changeContent, changeBlockTitle } = props;

  const [showLongCrossNote, setLongCrossNote] = useState<boolean>(false);
  const { socket } = SpectatorSocket.getInstance();
  // =========ROUND STATES================================
  const [roundIsPreparing, setIsPreparing] = useState(true);
  const [isWaitingForCross, setIsWaitingForCross] = useState(false);
  const [roundIsActive, setRoundIsActive] = useState(false);
  const [roundHasEnded, setRoundHasEnded] = useState(false);
  const [alreadyStopped, setAlreadyStopped] = useState(false);

  // ===========BUTTON STATES================================
  const [activateBtnDisabled, setActivateBtnDisabled] = useState(false);
  const [exitBtnDisabled, setExitBtnDisabled] = useState(false);
  const [stopBtnDisabled, setStopBtnDisabled] = useState(true);
  const [bustBtnDisabled, setBustBtnDisabled] = useState(true);
  const [skipBtnDisabled, setSkipBtnDisabled] = useState(true);
  const [editResultBtnDisabled, setEditResultBtnDisabled] = useState(true);

  const [editResultsOpen, setResultsOpen] = useState(false);
  const [crossErrorOpen, setCrossErrorOpen] = useState(false);
  const [errorText, setErrorText] = useState<string>();
  const [isActivatedRemotely, setActivatedRemotely] = useState<boolean>(false);
  const [crossCount, setCrossCount] = useState(0);
  const [showCounter, setShowCounter] = useState<boolean>(false);
  const [bluetoothFaultTime, setBluetoothFaultTime] = useState(0);

  const waitRemoteActivation = useCallback(async () => {
    const response = await roundStartRemote();

    console.log("remote activation response:", response);
    if (response) {
      setActivatedRemotely(true); //check
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
      console.log("received fault from remote control");
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

  const activateBtnHandler = useCallback(async () => {
    window.stop();
    waitForRemoteStop();
    setCrossCount(0);
    setIsWaitingForCross(true);
    setAlreadyStopped(false);
    console.log("awaiting for cross...");
    setShowCounter(true);

    const timeStamp = await roundStart();

    if (timeStamp) {
      setRoundIsActive(true);
      waitBluetoothFaultTime();
      setCrossCount(1);
    }
  }, []);

  const activateRemotely = async () => {
    setAlreadyStopped(false);
    console.log("started remotely. awaiting for cross...");
    setShowCounter(true);
    setCrossCount(0);
    setIsWaitingForCross(true);
    const timeStamp = await roundStartRemoteCross();

    console.log("result of remote crossing: ", timeStamp);
    if (timeStamp?.cross) {
      setRoundIsActive(true);
      setCrossCount(1);
      waitBluetoothFaultTime();
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
    setStopBtnDisabled(true);

    if (response.status) {
      setErrorText(response.status);
      toggleBackDrop(true);
      setIsPreparing(true);
      return;
    }

    // somehow roundIsActive here is false. need to find the reason
    // if (roundIsActive && response.result) {
    if (response.result) {
      await setPrepareState();
      setRoundHasEnded(true);
      const receivedCrosses = await getAllCrosses();
      if (receivedCrosses) {
        setCrossCount(receivedCrosses.length);
      }
      setTimeout(() => {
        waitRemoteActivation();
      }, 300);
    }
  };

  const toggleBackDrop = (val) => {
    setCrossErrorOpen(val);
  };

  const stopButtonHandler = useCallback(async () => {
    const stopResponse = await roundStop();
    if (!alreadyStopped) {
      window.stop();
      setAlreadyStopped(true);
    }
    clearInterval(skipBlockInterval);
    clearInterval(bustBlockInterval);
    setStopBtnDisabled(true);

    if (stopResponse.text?.status) {
      window.stop();
      setErrorText(stopResponse.text.status);
      toggleBackDrop(true);
      setIsPreparing(true);
      return;
    }

    if (stopResponse.result) {
      setRoundHasEnded(true);
      const receivedCrosses = await getAllCrosses();
      if (receivedCrosses) {
        setCrossCount(receivedCrosses.length);
      }
    }
    await setPrepareState();
  }, [isWaitingForCross, roundIsActive]);

  const bustButtonHandler = useCallback(async () => {
    setBustBtnDisabled(true);
    await sendBust();
    setBustBtnDisabled(false);
  }, []);

  const skipButtonHandler = useCallback(async () => {
    setSkipBtnDisabled(true);
    await sendSkip();
    setSkipBtnDisabled(false);
  }, []);

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

  useEffect(() => {
    if (isWaitingForCross) {
      setIsPreparing(false);
      setActivateBtnDisabled(true);
      setExitBtnDisabled(true);
      setStopBtnDisabled(false);
      setBustBtnDisabled(true);
      setSkipBtnDisabled(true);
    }
  }, [isWaitingForCross]);

  useEffect(() => {
    if (roundIsActive) {
      setIsWaitingForCross(false);
      setIsPreparing(false);
      setRoundHasEnded(false);
      setExitBtnDisabled(true);
      setStopBtnDisabled(false);
      setActivateBtnDisabled(true);
      setEditResultBtnDisabled(true);
      setBustBtnDisabled(false);
      setSkipBtnDisabled(false);
    }
  }, [roundIsActive]);

  useEffect(() => {
    if (roundHasEnded) {
      setIsWaitingForCross(false);
      setIsPreparing(false);
      setRoundIsActive(false);
      setExitBtnDisabled(false);
      setStopBtnDisabled(true);
      setActivateBtnDisabled(false);
      setEditResultBtnDisabled(false);
      setBustBtnDisabled(true);
      setSkipBtnDisabled(true);
      setActivatedRemotely(false);
    }
  }, [roundHasEnded]);

  useEffect(() => {
    if (roundIsPreparing) {
      setTimeout(() => {
        waitRemoteActivation();
      }, 300);
      setRoundIsActive(false);
      setRoundHasEnded(false);
      setIsWaitingForCross(false);
      setExitBtnDisabled(false);
      setActivateBtnDisabled(false);
      setStopBtnDisabled(true);
      clearInterval(skipBlockInterval);
      clearInterval(bustBlockInterval);
      setBustBtnDisabled(true);
      setSkipBtnDisabled(true);
      setShowCounter(false);
      setActivatedRemotely(false);
    }
  }, [roundIsPreparing]);

  useEffect(() => {
    socket.on("longCross", (data) => {
      console.log("got long cross", data);
      setLongCrossNote(true);
      setIsPreparing(true);
    })
      return () => {
      socket.disconnect();
    }
  }, []);

  return (
    <React.Fragment>
      <Box display="flex" color="#000" justifyContent="end" minHeight="30px">
        <Typography fontSize="20px" color="#5c5c5c" fontWeight="600">
          {showCounter && `Crosses: ${crossCount}`}
        </Typography>
      </Box>
      <Box marginTop="30px" display="flex" flexDirection="column" gap="20px">
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-evenly",
            border: "1px solid #eaeaea",
            boxSizing: "border-box",
            borderRadius: "5px",
            padding: "30px 20px",
            "& .controls__btn": {
              flexBasis: "auto",
              fontSize: "18px",
              width: "230px",
              height: "60px",
              padding: "20px 70px",
            },
          }}
        >
          {/* ACTIVATE */}
          <Button
            disabled={activateBtnDisabled}
            variant="outlined"
            sx={{
              color: "#562cff",
              borderColor: "#562cff",
            }}
            className="controls__btn"
            onClick={activateBtnHandler}
          >
            Activate
          </Button>

          {/* STOP */}
          <Button
            disabled={stopBtnDisabled}
            variant="outlined"
            sx={{
              color: "#dd403a",
              borderColor: "#dd403a",
              "&:hover": {
                backgroundColor: "hsl(3, 100%, 93%)",
                borderColor: "#dd403a",
              },
            }}
            className="controls__btn"
            onClick={stopButtonHandler}
          >
            Stop
          </Button>

          {/* ADD BUST */}
          <Button
            disabled={bustBtnDisabled}
            sx={{
              backgroundColor: "#dd403a",
              "&:hover": {
                backgroundColor: "#a6312d",
              },
            }}
            variant="contained"
            className="controls__btn"
            onClick={bustButtonHandler}
          >
            Bust
          </Button>

          {/* ADD SKIP */}
          <Button
            disabled={skipBtnDisabled}
            sx={{
              backgroundColor: "#dd403a",
              "&:hover": {
                backgroundColor: "#a6312d",
              },
            }}
            variant="contained"
            className="controls__btn"
            onClick={skipButtonHandler}
          >
            Skip
          </Button>
        </Box>
        <Box display="flex" alignSelf="end" gap="15px">
          <Button
            disabled={exitBtnDisabled}
            sx={{
              padding: "10px 30px",
            }}
            variant="outlined"
            color="error"
            onClick={async () => {
              window.stop();
              changeContent("tournamentsList");
              changeBlockTitle("Tournaments");
            }}
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
            variant="contained"
            onClick={() => setResultsOpen(true)}
          >
            Edit results
          </Button>
        </Box>
      </Box>
      <EditResultsBackDrop open={editResultsOpen} setOpen={setResultsOpen} />
      <SingleCrossBackDrop
        open={crossErrorOpen}
        onClick={() => setCrossErrorOpen(false)}
        errorText={errorText}
      />

      {showLongCrossNote && (
        <Box display="flex">
          <CustomizedSnackbar
            severity="error"
            message="Last cross took to much time. Please check cross detector"
            autoHide={10000}
          />
        </Box>
      )}
    </React.Fragment>
  );
};

export default TrainingModeControls;
