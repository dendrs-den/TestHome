import { Divider } from "@mui/material";
import { useState } from "react";
import ExitBackdrop from "../../UI/ExitBackdrop/ExitBackDrop";
import classes from "./NavigationBlock.module.css";

const NavigationBlock = (props) => {
  const [selectedFirst, setSelectedFirst] = useState(true);
  const [selectedSecond, setSelectedSecond] = useState(false);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState();

  const handleClose = () => {
    setOpen(false);
  };
  const handleToggle = () => {
    setOpen(!open);
  };

  const outlineTournaments = () => {
    setSelectedFirst(true);
    setSelectedSecond(false);
  };

  const outlineHistory = () => {
    setSelectedFirst(false);
    setSelectedSecond(true);
  };

  const tournamentsButtonHandler = () => {
    setContent("tournamentsList");
    if (props.changesMade) {
      handleToggle();
    } else {
      outlineTournaments();
      props.onChangeContent("tournamentsList");
      props.changeBlockTitle("Tournaments");
    }
  };

  const historyButtonHandler = () => {
    setContent("history");
    if (props.changesMade) {
      handleToggle();
    } else {
      outlineHistory();
      props.onChangeContent("history");
      props.changeBlockTitle("History");
    }
  };

  return (
    <div className={classes.navigationBlock}>
      <div className={classes.upperNavBlock}>
        <h3>Navigation</h3>
        <div className={classes.navBlock}>
          <button
            onClick={tournamentsButtonHandler}
            className={`${classes.navBtn} ${selectedFirst ? classes.navBtn_selected : ""}`}
          >
            Tournaments
          </button>
          <Divider />
          <button
            onClick={historyButtonHandler}
            className={`${classes.navBtn} ${selectedSecond ? classes.navBtn_selected : ""}`}
          >
            History
          </button>

          <ExitBackdrop
            open={open}
            handleClose={handleClose}
            changeContent={props.onChangeContent}
            changeTitle={props.changeBlockTitle}
            content={content}
            setChangesMade={props.setChangesMade}
            outlineTournaments={outlineTournaments}
            outlineHistory={outlineHistory}
            toggleDrawer={props.toggleDrawer}
          />
        </div>
      </div>
    </div>
  );
};
export default NavigationBlock;
