// @ts-nocheck
import React, { useState, useCallback, useEffect } from "react";
import HistoryBlock from "../Components/InitialPage/History/HistoryBlock";
import NewTournamentBlock from "../Components/NewTournament/NewTournamentBlock/NewTournamentBlock";
import classes from "./InitialPage.module.scss";
import NavigationBlock from "../Components/InitialPage/NavigationBlock/NavigationBlock";
import RoundStageNavigation from "../Components/InitialPage/RoundStageNavigation/RoundStageNavigation";
import getAllTournaments from "../Api_requests/tournaments/getAllTournaments";
import infoscreenLogo from "../images/infoscreen_logo3.png";
import EditTournament from "../Components/EditTournament/EditTournament";
import BaseDrawer from "../Components/UI/BaseDrawer/BaseDrawer";
import { Box, Button, Drawer } from "@mui/material";
import TournamentsList from "../Sections/TournamentsList/TournamentsList";
import TournamentsRounds from "../Sections/TournamentsRounds/TournamentsRounds";

const OVERLAY_CONTENT = new Set(["NewTournamentBlock", "editTournament"]);
const PRIMARY_CONTENT = new Set(["tournamentsList", "tournamentsRounds", "history"]);

const InitialPage = (props) => {
  const { changeBlockTitle, onOpenServerSettings } = props;
  const [tournamentsList, setTournamentsList] = useState([]);
  const [tourDataLoading, setTourDataLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [currentMainContent, setCurrentMainContent] =
    useState("tournamentsList");
  const [lastPrimaryContent, setLastPrimaryContent] = useState("tournamentsList");
  const [changesMade, setChangesMade] = useState(false);
  const [footerActions, setFooterActions] = useState(null);
  const [roundTabs, setRoundTabs] = useState([]);
  const [activeStageId, setActiveStageId] = useState(null);

  useEffect(() => {
    document.title = "InFlight terminal";
  }, []);

  useEffect(() => {
    const needReturnToRounds = sessionStorage.getItem("legacyRefReturn") === "1";
    if (needReturnToRounds) {
      setCurrentMainContent("tournamentsRounds");
      sessionStorage.removeItem("legacyRefReturn");
    }
  }, []);

  const renderConditions = {
    tournamentList:
      (OVERLAY_CONTENT.has(currentMainContent)
        ? lastPrimaryContent
        : currentMainContent) === "tournamentsList",
    tournamentsRounds:
      (OVERLAY_CONTENT.has(currentMainContent)
        ? lastPrimaryContent
        : currentMainContent) === "tournamentsRounds",
    historyList:
      (OVERLAY_CONTENT.has(currentMainContent)
        ? lastPrimaryContent
        : currentMainContent) === "history",
    newTournamentForm: currentMainContent === "NewTournamentBlock",
    editTournament: currentMainContent === "editTournament",
  };

  const headerTitleByContent = {
    tournamentsList: "Tournament list",
    tournamentsRounds: props.blockTitle,
    history: "History",
    NewTournamentBlock: "Add tournament",
    editTournament: "Edit tournament",
  };
  const currentHeaderTitle =
    headerTitleByContent[currentMainContent] || props.blockTitle;

  useEffect(() => {
    setFooterActions(null);
  }, [currentMainContent]);

  useEffect(() => {
    if (PRIMARY_CONTENT.has(currentMainContent)) {
      setLastPrimaryContent(currentMainContent);
    }
  }, [currentMainContent]);

  useEffect(() => {
    if (currentMainContent !== "tournamentsRounds") {
      setRoundTabs([]);
      setActiveStageId(null);
    }
  }, [currentMainContent]);

  const changeCurrentMainContentHandler = async (newContent) => {
    setCurrentMainContent(newContent);

    if (newContent === "tournamentsList") {
      await fetchDataHandler(true);
    }
  };

  const setSelectedTourId = (val) => {
    setSelectedId(val);
  };

  const closeTournamentEditor = () => {
    if (
      changesMade &&
      !window.confirm("Close form without saving changes?")
    ) {
      return;
    }
    setChangesMade(false);
    setCurrentMainContent(lastPrimaryContent);
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
      <Box className={classes.container}>
        <Box className={classes.shell}>
          <Box component={"nav"} className={classes.navigation}>
            <div className={classes.logo}>
              <React.Fragment>
                <img src={infoscreenLogo} alt="Flow Moscow logo" />
              </React.Fragment>
            </div>
            {currentMainContent === "tournamentsRounds" ? (
              <RoundStageNavigation
                stages={roundTabs}
                activeStageId={activeStageId}
                onSelectStage={setActiveStageId}
              />
            ) : (
              <NavigationBlock
                onChangeContent={changeCurrentMainContentHandler}
                changeBlockTitle={changeBlockTitle}
                changesMade={changesMade}
                setChangesMade={setChangesMade}
              />
            )}
          </Box>
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
              <Box className={classes.headerActions}>
                <Box className={classes.statusStrip}>
                  <span className={`${classes.statusPill} ${classes.statusPillOk}`}>
                    Core online
                  </span>
                  <span className={`${classes.statusPill} ${classes.statusPillOk}`}>
                    Sensor ready
                  </span>
                </Box>
              </Box>
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
                    changeBlockTitle={changeBlockTitle}
                    setFooterActions={setFooterActions}
                    setSelectedId={setSelectedTourId}
                    selectedId={selectedId}
                  />
                )}

                {renderConditions.historyList && <HistoryBlock />}

                {renderConditions.tournamentsRounds && (
                  <TournamentsRounds
                    changeBlockTitle={changeBlockTitle}
                    changeContent={changeCurrentMainContentHandler}
                    setFooterActions={setFooterActions}
                    stageTabs={roundTabs}
                    activeStageId={activeStageId}
                    onActiveStageChange={setActiveStageId}
                    onStageTabsChange={setRoundTabs}
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
        </Box>

        <Drawer
          anchor="right"
          open={renderConditions.newTournamentForm || renderConditions.editTournament}
          onClose={closeTournamentEditor}
          slotProps={{ paper: { className: classes.editorDrawerPaper } }}
          ModalProps={{ keepMounted: true }}
        >
          <Box className={classes.editorDrawer}>
            <Box className={classes.editorDrawerHeader}>
              <div>
                <h3 className={classes.editorDrawerTitle}>{currentHeaderTitle}</h3>
                <p className={classes.editorDrawerSubtitle}>
                  {renderConditions.editTournament
                    ? "Adjust tournament parameters and participants"
                    : "Create a new tournament and configure parameters"}
                </p>
              </div>
              <Button
                variant="outlined"
                color="inherit"
                className={classes.editorDrawerClose}
                onClick={closeTournamentEditor}
              >
                Close
              </Button>
            </Box>
            <Box className={classes.editorDrawerBody}>
              {renderConditions.newTournamentForm && (
                <NewTournamentBlock
                  setChangesMade={setChangesMade}
                  onContentChange={changeCurrentMainContentHandler}
                  setFooterActions={setFooterActions}
                  changeBlockTitle={changeBlockTitle}
                  useInlineFooter={true}
                  onClose={closeTournamentEditor}
                />
              )}

              {renderConditions.editTournament && (
                <EditTournament
                  selectedId={selectedId}
                  setChangesMade={setChangesMade}
                  setFooterActions={setFooterActions}
                  onContentChange={changeCurrentMainContentHandler}
                  useInlineFooter={true}
                  onClose={closeTournamentEditor}
                />
              )}
            </Box>
          </Box>
        </Drawer>
      </Box>
    </React.Fragment>
  );
};

export default InitialPage;
