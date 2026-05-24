import React, { Fragment, useState } from "react";
import DeleteTournamentButton from "../../Components/UI/Buttons/DeleteTournamentButton/DeleteTournamentButton";
import TournamentsTable from "./TournamentsTable/TournamentsTable";
import TrainingModeButton from "../../Components/InitialPage/AddNewTournamentButton/TrainingModeButton";
import classes from "./TournamentsList.module.scss";
import deleteTournamentById from "../../Api_requests/tournaments/deleteTournamentById";
import setCurrentTournamentById from "../../Api_requests/tournaments/setCurrentTournament";
import setPrepareState from "../../Api_requests/roundState/setPrepareState";
import SubmitTournamentButton from "./AddNewTournamentButton/SubmitTournamentButton";
import getAllTournaments from "../../Api_requests/tournaments/getAllTournaments";
import AddBoxIcon from "@mui/icons-material/AddBox";
import { Button, IconButton, Box } from "@mui/material";
import CircularProgressDialog from "../../Components/UI/Backdrop/CircularProgressDialog/CircularProgressDialog";
import setServerTrainingMode from "../../Api_requests/tournaments/setServerTrainingMode";

const TournamentsList = (props) => {
  const { setSelectedId, selectedId, tourDataLoading } = props;

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
    try {
      await setCurrentTournamentById(selectedId);
      props.changeContent("tournamentsRounds");
    } catch (e) {
      console.log("Failed to set current tournament", e);
    } finally {
      setIsLoading(false);
    }
  };

  const trainingSubmitHandler = async () => {
    setIsLoading(true);
    try {
      await setServerTrainingMode();
      await setPrepareState();
      props.changeContent("trainingRefereePanel");
    } catch (e) {
      console.log("Failed to start training mode", e);
    } finally {
      setIsLoading(false);
    }
  };

  // DELETE TOURNAMENT FROM THE LIST AND DATA BASE
  const tourDeleteHandler = async (tour_id) => {
    await deleteTournamentById(tour_id);
    // Request for all tournaments again to update list
    props.setTournamentsListHandler(await getAllTournaments());
    // Block buttons after deleting
    setIsActivated(false);
  };

  return (
    <Fragment>
      <CircularProgressDialog open={isLoading} />
      <Box className={classes.tournaments}>
        <Box className={classes.upperRow}>
          <h3 className={classes.header}>Tournament list</h3>
          <Button
            className={classes.addTournamentBtn}
            onClick={() => props.changeContent("NewTournamentBlock")}
          >
            Add tournament
          </Button>
          <IconButton
            className={classes.addTournamentIcon}
            onClick={() => props.changeContent("NewTournamentBlock")}
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
            changeContent={props.changeContent}
            clickHandler={listItemSelectHandler}
            doubleClickHandler={tourSubmitHandler}
            renderedData={props.apiData || []}
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
            active={isActivated}
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
