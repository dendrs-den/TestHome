import React, { Fragment, useEffect, useState } from "react";
import TournamentsTable from "./TournamentsTable/TournamentsTable";
import classes from "./TournamentsList.module.scss";
import deleteTournamentById from "../../Api_requests/tournaments/deleteTournamentById";
import setCurrentTournamentById from "../../Api_requests/tournaments/setCurrentTournament";
import getAllTournaments from "../../Api_requests/tournaments/getAllTournaments";
import { Button, Box } from "@mui/material";
import CircularProgressDialog from "../../Components/UI/Backdrop/CircularProgressDialog/CircularProgressDialog";
import setAdministrationState from "../../Api_requests/roundState/setAdministrationState";

const TournamentsList = (props) => {
  const {
    setSelectedId,
    selectedId,
    tourDataLoading,
    apiData,
    changeContent,
    setTournamentsListHandler,
    setFooterActions,
    changeBlockTitle,
  } = props;

  // const [apiData, setApiData] = useState([]);
  const [isActivated, setIsActivated] = useState(false);
  const [currentSelectedRow, setCurrentSelectedRow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const listItemSelectHandler = (val) => {
    setCurrentSelectedRow(val);
    setIsActivated(true);
    setSelectedId(val);
  };

  // SET SELECTED TOUR AS CURRENT AND NAVIGATE ITS ROUNDS SECTION
  const tourSubmitHandler = async (forcedId = null) => {
    const fallbackId = forcedId ?? selectedId ?? apiData?.[0]?.id;
    if (!fallbackId) {
      return;
    }
    setIsLoading(true);
    await setCurrentTournamentById(fallbackId);
    changeContent("tournamentsRounds");
  };

  // DELETE TOURNAMENT FROM THE LIST AND DATA BASE
  const tourDeleteHandler = async (tour_id) => {
    await deleteTournamentById(tour_id);
    // Request for all tournaments again to update list
    setTournamentsListHandler(await getAllTournaments());
    // Block buttons after deleting
    setIsActivated(false);
  };

  useEffect(() => {
    setAdministrationState();
  }, []);

  useEffect(() => {
    setFooterActions(null);
    return () => setFooterActions(null);
  }, [setFooterActions]);

  return (
    <Fragment>
      <CircularProgressDialog open={isLoading} />
      <Box className={classes.tournaments}>
        <Box className={classes.tableWrap}>
          <h3 className={classes.sectionTitle}>Tournaments</h3>
          <TournamentsTable
            changeContent={changeContent}
            clickHandler={listItemSelectHandler}
            doubleClickHandler={tourSubmitHandler}
            openTournament={tourSubmitHandler}
            renderedData={apiData || []}
            tourDataLoading={tourDataLoading}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
          <Box className={classes.tableFooter}>
            <Button
              className={`${classes.footerBtn} ${classes.footerBtnPrimary}`}
              onClick={() => {
                changeBlockTitle?.("Add tournament");
                changeContent("NewTournamentBlock");
              }}
            >
              Create tournament
            </Button>
            <Button
              className={classes.footerBtn}
              disabled={!isActivated}
              onClick={() => tourDeleteHandler(currentSelectedRow)}
            >
              Delete tournament
            </Button>
          </Box>
        </Box>
      </Box>
    </Fragment>
  );
};

export default TournamentsList;
