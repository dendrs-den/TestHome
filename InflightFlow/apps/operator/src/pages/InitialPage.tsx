import React, { useState, useCallback, useEffect } from "react";
import HistoryBlock from "../Components/InitialPage/History/HistoryBlock";
import NewTournamentBlock from "../Components/NewTournament/NewTournamentBlock/NewTournamentBlock";
import classes from "./InitialPage.module.scss";
import NavigationBlock from "../Components/InitialPage/NavigationBlock/NavigationBlock";
import RefereePanel from "../Sections/RefereePage/RefereePanel/RefereePanel";
import getAllTournaments from "../Api_requests/tournaments/getAllTournaments";
import setAdministrationState from "../Api_requests/roundState/setAdministrationState";
import getCurrentState from "../Api_requests/getCurrentState";
import infoscreenLogo from "../images/infoscreen_logo3.png";
import { Helmet } from "react-helmet";
import EditTournament from "../Components/EditTournament/EditTournament";
import BaseDrawer from "../Components/UI/BaseDrawer/BaseDrawer";
import { Box } from "@mui/material";
import lp from "../Api_requests/longpoll/longpoll";
import TournamentsList from "../Sections/TournamentsList/TournamentsList";
import TournamentsRounds from "../Sections/TournamentsRounds/TournamentsRounds";
import TrainingModePanel from "../Sections/TrainingModePage/TrainingModePanel";

const InitialPage = (props) => {
  const { changeBlockTitle } = props;
  const [tournamentsList, setTournamentsList] = useState([]);
  const [tourDataLoading, setTourDataLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [currentMainContent, setCurrentMainContent] =
    useState("tournamentsList");
  const [changesMade, setChangesMade] = useState(false);
  const [trainingMode, setTrainingMode] = useState(false);
  const [footerActions, setFooterActions] = useState(null);
  useEffect(() => {
    lp.Subscribe("addDevice", () => {}, "bluetoothTableUpdate");
    lp.Subscribe("removeDevice", () => {}, "bluetoothTableUpdate");
    lp.Subscribe("updateDevice", () => {});
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

  const headerTitleByContent = {
    tournamentsList: "Tournament list",
    tournamentsRounds: props.blockTitle,
    history: "History",
    NewTournamentBlock: "Adding new tournament",
    editTournament: "Editing tournament",
    refereePanel: "",
    trainingRefereePanel: "Training mode",
  };
  const currentHeaderTitle =
    headerTitleByContent[currentMainContent] || props.blockTitle;

  useEffect(() => {
    setFooterActions(null);
  }, [currentMainContent]);

  const changeCurrentMainContentHandler = async (newContent) => {
    setCurrentMainContent(newContent);
    const state = await getCurrentState();

    if (newContent !== "refereePanel") {
      setTrainingMode(false);
    }

    if (newContent === "tournamentsList") {
      await fetchDataHandler(true);
      if (state !== "Administration") {
        // await setAdministrationState();
      }
    }
  };

  const setSelectedTourId = (val) => {
    setSelectedId(val);
  };

  const setTournamentsListHandler = (data) => {
    setTournamentsList(data);
  };

  const fetchDataHandler = useCallback(async (force = false) => {
    if (force || !tournamentsList?.length) {
      setTourDataLoading(true);
      const data = await getAllTournaments();
      setTournamentsListHandler(data);
      setTourDataLoading(false);
    }
  }, [tournamentsList?.length]);

  useEffect(() => {
    fetchDataHandler(true);
  }, [fetchDataHandler]);

  // useEffect(() => {
  //   if (!tournamentsList?.length) {
  //     fetchDataHandler();
  //   }
  // }, [fetchDataHandler, changeBlockTitle]);

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
                    <img src={infoscreenLogo} alt="Flow Moscow logo" />
                  </React.Fragment>
                </div>
                <NavigationBlock
                  onChangeContent={changeCurrentMainContentHandler}
                  changeBlockTitle={changeBlockTitle}
                  changesMade={changesMade}
                  setChangesMade={setChangesMade}
                />
              </Box>
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
              {currentHeaderTitle}
            </h2>
            <div className={classes.drawer}>
              <BaseDrawer
                onChangeContent={changeCurrentMainContentHandler}
                changeBlockTitle={changeBlockTitle}
                changesMade={changesMade}
                setChangesMade={setChangesMade}
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
                  setFooterActions={setFooterActions}
                  setSelectedId={setSelectedTourId}
                  selectedId={selectedId}
                />
              )}

              {renderConditions.historyList && <HistoryBlock />}

              {renderConditions.newTournamentForm && (
                <NewTournamentBlock
                  setChangesMade={setChangesMade}
                  onContentChange={changeCurrentMainContentHandler}
                  setFooterActions={setFooterActions}
                  changeBlockTitle={changeBlockTitle}
                />
              )}

              {renderConditions.editTournament && (
                <EditTournament
                  selectedId={selectedId}
                  setChangesMade={setChangesMade}
                  setFooterActions={setFooterActions}
                  onContentChange={changeCurrentMainContentHandler}
                />
              )}

              {renderConditions.tournamentsRounds && (
                <TournamentsRounds
                  changeBlockTitle={changeBlockTitle}
                  changeContent={changeCurrentMainContentHandler}
                  setFooterActions={setFooterActions}
                />
              )}

              {renderConditions.refereePanel && (
                <RefereePanel
                  changeBlockTitle={changeBlockTitle}
                  changeContent={changeCurrentMainContentHandler}
                  isTrainingMode={trainingMode}
                  setFooterActions={setFooterActions}
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
          <footer
            className={`${classes.footer} ${
              classes[`${[currentMainContent]}`]
            }`}
          >
            <div className={classes.footerInner}>{footerActions}</div>
          </footer>
        </Box>

        {/* END OF MAIN CONTENT */}
      </Box>
    </React.Fragment>
  );
};

export default InitialPage;
