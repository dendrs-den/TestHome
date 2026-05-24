import { Button } from "@mui/material";
import React, { useState } from "react";
import ExitBackdrop from "../../UI/ExitBackdrop/ExitBackDrop";
import classes from "./BackButton.module.css";

const BackButton = (props) => {
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };
  const handleToggle = () => {
    setOpen(!open);
  };

  return (
    <React.Fragment>
      <Button
        variant="outlined"
        color="error"
        className={classes["backBtn"]}
        onClick={
          props.isModified
            ? handleToggle
            : () => props.changeContent("tournamentsList")
        }
      >
        Cancel
      </Button>
      <ExitBackdrop
        open={open}
        handleClose={handleClose}
        onClick={props.onClick}
        changeContent={props.changeContent}
        setChangesMade={props.setChangesMade}
      />
    </React.Fragment>
  );
};

export default BackButton;
