import React, { useState, useCallback, useEffect } from "react";
import HistoryBlock from "../Components/InitialPage/History/HistoryBlock";
import NewTournamentBlock from "../Components/NewTournament/NewTournamentBlock/NewTournamentBlock";
import classes from "./InitialPage.module.scss";
import NavigationBlock from "../Components/InitialPage/NavigationBlock/NavigationBlock";
import RefereePanel from "../Sections/RefereePage/RefereePanel/RefereePanel";
import getAllTournaments from "../Api_requests/tournaments/getAllTournaments";
import setAdministrationState from "../Api_requests/roundState/setAdministrationState";
import getCurrentState from "../Api_requests/getCurrentState";
import main_logo from "../images/main_logo2.png";
import { Helmet } from "react-helmet";
import EditTournament from "../Components/EditTournament/EditTournament";
import BaseDrawer from "../Components/UI/BaseDrawer/BaseDrawer";
import BlueToothButton from "../Components/UI/Buttons/BlueToothButton";
import BluetoothBackDrop from "../Components/UI/Backdrop/BluetoothBackDrop/BluetoothBackDrop";
import { Box } from "@mui/material";
import getAllBluetoothConnections from "../Api_requests/bluetooth/getAllConnections";
import lp from "../Api_requests/longpoll/longpoll";
import TournamentsList from "../Sections/TournamentsList/TournamentsList";
import TournamentsRounds from "../Sections/TournamentsRounds/TournamentsRounds";
import TrainingModePanel from "../Sections/TrainingModePage/TrainingModePanel";
import LightSwitcher from "../Components/LightSwitcher/LightSwitcher";

const InitialPage = (props) => {
  const { changeBlockTitle } = props;
  const [tournamentsList, setTournamentsList] = useState([]);
  const [tourDataLoading, setTourDataLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [openBluetooth, setOpenBluetooth] = useState(false);
  const [currentMainContent, setCurrentMainContent] =
    useState("tournamentsList");
  const [changesMade, setChangesMade] = useState(false);
  const [trainingMode, setTrainingMode] = useState(false);
  const [devicesList, setDevicesList] = useState({
    bluetoothDevices: [],
    connectedDevices: [],
    maps: [],
  });

  useEffect(() => {
    lp.Subscribe(
      "addDevice",
      (data) => {
        setDevicesList((prev) => {
          // let newList = structuredClone(prev);

          const newList = { ...prev };

          const index = prev.bluetoothDevices.findIndex(
            (item) => item.mac === data.mac
          );
          if (index === -1) {
            newList.bluetoothDevices = [...newList.bluetoothDevices, data];
          }

          return newList;
        });
      },
      "bluetoothTableUpdate"
    );

    lp.Subscribe(
      "removeDevice",
      (data) => {
        setDevicesList((prev) => {
          // let newList = structuredClone(prev);
          const newList = { ...prev };
          if (newList?.bluetoothDevices) {
            newList.bluetoothDevices = newList.bluetoothDevices.filter(
              (item) => item.mac !== data.mac
            );
          }

          return newList;
        });
      },
      "bluetoothTableUpdate"
    );

    lp.Subscribe(
      "updateDevice",
      (data) => {
        setDevicesList((prev) => {
          // let newList = structuredClone(prev);
          const newList = { ...prev };

          const index = prev.bluetoothDevices.findIndex(
            (item) => item.mac === data.mac
          );
          if (index !== -1) {
            newList.bluetoothDevices[index] = { ...data };
          }

          return newList;
        });
      }
      // "bluetoothTableUpdate"
    );
  }, []);

  const renderConditions = {
    tournamentList: currentMainContent === "tournamentsList",
    tournamentsRounds: currentMainContent === "tournamentsRounds",
    historyList: currentMainContent === "history",
    newTournamentForm: currentMainContent === "NewTournamentBlock",
    refereePanel: currentMainContent === "refereePanel",
    editTournament: currentMainContent === "editTournament",
    trainingRefereePanel: currentMainContent === "trainingRefereePanel",
  };

  const changeCurrentMainContentHandler = async (newContent) => {
    setCurrentMainContent(newContent);
    const state = await getCurrentState();

    if (newContent !== "refereePanel") {
      setTrainingMode(false);
    }

    if (newContent === "tournamentsList") {
      if (state !== "Administration") {
        await setAdministrationState();
      }
      await fetchDataHandler();
    }
  };

  const setSelectedTourId = (val) => {
    setSelectedId(val);
  };

  const setTournamentsListHandler = (data) => {
    setTournamentsList(data);
  };

  const fetchDataHandler = useCallback(async () => {
    if (!tournamentsList.length) {
      setTourDataLoading(true);
      try {
        await setAdministrationState();
        const data = await getAllTournaments();
        setTournamentsListHandler(data);
      } finally {
        setTourDataLoading(false);
      }
    }
  }, []);

  const fetchBluetoothData = useCallback(async () => {
    const receivedData = await getAllBluetoothConnections();
    setDevicesList(receivedData);
  }, []);

  useEffect(() => {
    fetchBluetoothData();
  }, [fetchBluetoothData]);

  useEffect(() => {
    if (!tournamentsList.length) {
      fetchDataHandler();
    }
  }, [fetchDataHandler, changeBlockTitle]);

  return (
    <React.Fragment>
      <Helmet>
        <title>InFlight terminal</title>
      </Helmet>
      <Box className={classes.container}>
        {!renderConditions.refereePanel &&
          !renderConditions.trainingRefereePanel && (
            <Box>
              <Box component={"nav"} className={classes.navigation}>
                <div className={classes.logo}>
                  <React.Fragment>
                    <img src={main_logo} alt="Main Icon" />
                    <h1 className={classes.header_text}>Referee system</h1>
                  </React.Fragment>
                </div>
                <NavigationBlock
                  onChangeContent={changeCurrentMainContentHandler}
                  changeBlockTitle={changeBlockTitle}
                  changesMade={changesMade}
                  setChangesMade={setChangesMade}
                />
                <div className={classes.bluetoothBlock}>
                  <BlueToothButton setOpenBluetooth={setOpenBluetooth} />
                  <Box display="inline" ml="20px">
                    <LightSwitcher />
                  </Box>
                </div>
              </Box>
              {openBluetooth && (
                <BluetoothBackDrop
                  devicesList={devicesList}
                  fetchBluetoothData={fetchBluetoothData}
                  openBluetooth={openBluetooth}
                  setOpenBluetooth={setOpenBluetooth}
                />
              )}
            </Box>
          )}

        {/* MAIN CONTENT */}
        <Box
          className={`${classes.rightSideWrapper} ${
            classes[`${[currentMainContent]}`]
          }`}
        >
          {/* HEADER */}
          <header
            className={`${classes.header} ${
              classes[`${[currentMainContent]}`]
            }`}
          >
            <h2
              className={`${classes.content_header} ${
                classes[`${[props.blockTitle]}`]
              } ${classes[`${[currentMainContent]}`]}`}
            >
              {props.blockTitle}
            </h2>
            <div className={classes.drawer}>
              <BaseDrawer
                onChangeContent={changeCurrentMainContentHandler}
                changeBlockTitle={changeBlockTitle}
                changesMade={changesMade}
                setChangesMade={setChangesMade}
                setOpenBluetooth={setOpenBluetooth}
              />
            </div>
            {/* <Box position="absolute" right="10px">
              <LightSwitcher />
            </Box> */}
          </header>
          {/* END OF HEADER */}

          <Box
            component="main"
            className={`${classes.main} ${classes[`${props.blockTitle}`]}
            }`}
          >
            <section className={classes.dynamic_content}>
              {renderConditions.tournamentList && (
                <TournamentsList
                  tourDataLoading={tourDataLoading}
                  apiData={tournamentsList}
                  setTournamentsListHandler={setTournamentsListHandler}
                  changeContent={changeCurrentMainContentHandler}
                  setSelectedId={setSelectedTourId}
                  selectedId={selectedId}
                />
              )}

              {renderConditions.historyList && <HistoryBlock />}

              {renderConditions.newTournamentForm && (
                <NewTournamentBlock
                  setChangesMade={setChangesMade}
                  onContentChange={changeCurrentMainContentHandler}
                  changeBlockTitle={changeBlockTitle}
                />
              )}

              {renderConditions.editTournament && (
                <EditTournament
                  selectedId={selectedId}
                  setChangesMade={setChangesMade}
                  onContentChange={changeCurrentMainContentHandler}
                />
              )}

              {renderConditions.tournamentsRounds && (
                <TournamentsRounds
                  changeBlockTitle={changeBlockTitle}
                  changeContent={changeCurrentMainContentHandler}
                />
              )}

              {renderConditions.refereePanel && (
                <RefereePanel
                  changeBlockTitle={changeBlockTitle}
                  changeContent={changeCurrentMainContentHandler}
                  isTrainingMode={trainingMode}
                />
              )}
              {renderConditions.trainingRefereePanel && (
                <TrainingModePanel
                  changeBlockTitle={changeBlockTitle}
                  changeContent={changeCurrentMainContentHandler}
                />
              )}
            </section>
          </Box>
        </Box>

        {/* END OF MAIN CONTENT */}
      </Box>
    </React.Fragment>
  );
};

export default InitialPage;
