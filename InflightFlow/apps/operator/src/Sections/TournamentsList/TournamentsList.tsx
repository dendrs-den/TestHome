import React, { Fragment, useEffect, useState } from "react";
import DeleteTournamentButton from "../../Components/UI/Buttons/DeleteTournamentButton/DeleteTournamentButton";
import TournamentsTable from "./TournamentsTable/TournamentsTable";
import classes from "./TournamentsList.module.scss";
import deleteTournamentById from "../../Api_requests/tournaments/deleteTournamentById";
import setCurrentTournamentById from "../../Api_requests/tournaments/setCurrentTournament";
import SubmitTournamentButton from "./AddNewTournamentButton/SubmitTournamentButton";
import getAllTournaments from "../../Api_requests/tournaments/getAllTournaments";
import AddBoxIcon from "@mui/icons-material/AddBox";
import { Button, IconButton, Box } from "@mui/material";
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
  const tourSubmitHandler = async () => {
    const fallbackId = selectedId ?? apiData?.[0]?.id;
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
    setFooterActions(
      <Box className={classes.actionsRow}>
        <DeleteTournamentButton
          className={classes.btn}
          active={isActivated}
          deleteHandler={() => tourDeleteHandler(currentSelectedRow)}
        />
        <SubmitTournamentButton
          className={classes.btn}
          active={isActivated}
          clickHandler={tourSubmitHandler}
        />
      </Box>
    );

    return () => setFooterActions(null);
  }, [isActivated, currentSelectedRow, setFooterActions]);

  return (
    <Fragment>
      <CircularProgressDialog open={isLoading} />
      <Box className={classes.tournaments}>
        <Box
          className={classes.tableWrap}
          sx={{
            mt: "15px",
            position: "relative",
            width: "100%",
            border: "1px solid #d3d3d3",
          }}
        >
          <TournamentsTable
            changeContent={changeContent}
            clickHandler={listItemSelectHandler}
            doubleClickHandler={tourSubmitHandler}
            renderedData={apiData || []}
            tourDataLoading={tourDataLoading}
          />
          <Button
            className={classes.addTournamentBtn}
            onClick={() => changeContent("NewTournamentBlock")}
          >
            + ADD
          </Button>
          <IconButton
            className={classes.addTournamentIcon}
            onClick={() => changeContent("NewTournamentBlock")}
          >
            <AddBoxIcon sx={{ fontSize: "32px" }}></AddBoxIcon>
          </IconButton>
        </Box>
      </Box>
    </Fragment>
  );
};

export default TournamentsList;
