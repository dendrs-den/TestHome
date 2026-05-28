import { Backdrop, Button } from "@mui/material";
import classes from "./ExitBackDrop.module.scss";

const ExitBackdrop = (props) => {
  const discardBtnHandler = () => {
    props.changeContent(props.content || "tournamentsList");

    if (props.content) {
      if (props.content === "tournamentsList") {
        props.outlineTournaments(true);
        props.changeTitle("Tournaments");
      } else if (props.content === "history") {
        props.outlineHistory();
        props.changeTitle("History");
      }
    }
    props.handleClose();
    props.setChangesMade(false);
  };

  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={props.open}
    >
      <div className={classes["submitDeletion__window"]}>
        <h5 className={classes["submitDeletion__header"]}>Discard changes</h5>
        <p className={classes["submitDeletion__text"]}>
          Do you really want to discard changes
        </p>
        <div className={classes["submitDeletion_btnRow"]}>
          <Button color="primary" onClick={props.handleClose}>
            Cancel
          </Button>
          <Button color="error" onClick={discardBtnHandler}>
            Discard
          </Button>
        </div>
      </div>
    </Backdrop>
  );
};

export default ExitBackdrop;
