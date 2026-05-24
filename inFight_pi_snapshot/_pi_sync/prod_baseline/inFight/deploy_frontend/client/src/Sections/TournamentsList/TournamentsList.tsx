import React, { Fragment, useEffect, useState } from "react";
import DeleteTournamentButton from "../../Components/UI/Buttons/DeleteTournamentButton/DeleteTournamentButton";
import TournamentsTable from "./TournamentsTable/TournamentsTable";
import TrainingModeButton from "../../Components/InitialPage/AddNewTournamentButton/TrainingModeButton";
import classes from "./TournamentsList.module.scss";
import deleteTournamentById from "../../Api_requests/tournaments/deleteTournamentById";
import setCurrentTournamentById from "../../Api_requests/tournaments/setCurrentTournament";
import SubmitTournamentButton from "./AddNewTournamentButton/SubmitTournamentButton";
import getAllTournaments from "../../Api_requests/tournaments/getAllTournaments";
import AddBoxIcon from "@mui/icons-material/AddBox";
import { Button, IconButton, Box } from "@mui/material";
import CircularProgressDialog from "../../Components/UI/Backdrop/CircularProgressDialog/CircularProgressDialog";
import setServerTrainingMode from "../../Api_requests/tournaments/setServerTrainingMode";
import setAdministrationState from "../../Api_requests/roundState/setAdministrationState";

const TournamentsList = (props) => {
  const {
    setSelectedId,
    selectedId,
    tourDataLoading,
    apiData,
    changeContent,
    setTournamentsListHandler,
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
    setIsLoading(true);
    await setCurrentTournamentById(selectedId);
    changeContent("tournamentsRounds");
  };

  const trainingSubmitHandler = async () => {
    setIsLoading(true);
    await setServerTrainingMode();

    changeContent("trainingRefereePanel");
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

  return (
    <Fragment>
      <CircularProgressDialog open={isLoading} />
      <Box className={classes.tournaments}>
        <Box className={classes.upperRow}>
          <h3 className={classes.header}>Tournament list</h3>
          <Button
            className={classes.addTournamentBtn}
            onClick={() => changeContent("NewTournamentBlock")}
          >
            Add tournament
          </Button>
          <IconButton
            className={classes.addTournamentIcon}
            onClick={() => changeContent("NewTournamentBlock")}
          >
            <AddBoxIcon sx={{ fontSize: "40px" }}></AddBoxIcon>
          </IconButton>
        </Box>

        <Box
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
        </Box>

        <Box
          marginTop="20px"
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
        >
          <TrainingModeButton
            className={classes["btn"]}
            clickHandler={trainingSubmitHandler}
          />
          <Box display="flex" gap="20px">
            <DeleteTournamentButton
              className={classes["btn"]}
              active={isActivated}
              deleteHandler={() => tourDeleteHandler(currentSelectedRow)}
            />
            <SubmitTournamentButton
              className={classes["btn"]}
              active={isActivated}
              clickHandler={tourSubmitHandler}
            />
          </Box>
        </Box>
      </Box>
    </Fragment>
  );
};

export default TournamentsList;
