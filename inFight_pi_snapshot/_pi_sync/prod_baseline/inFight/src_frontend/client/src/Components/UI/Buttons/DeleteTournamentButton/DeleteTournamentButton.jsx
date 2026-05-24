import { Backdrop, Button } from "@mui/material";
import React, { useState } from "react";
import classes from "./DeleteTournamentButton.module.css";

const DeleteTournamentButton = (props) => {
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };
  const handleOpen = () => {
    setOpen(!open);
  };

  return (
    <React.Fragment>
      <Button
        className={classes["btn-delete"]}
        disabled={!props.active}
        color="error"
        variant="outlined"
        onClick={handleOpen}
      >
        {" "}
        Remove
      </Button>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
      >
        <div className={classes["submitDeletion__window"]}>
          <h5 className={classes["submitDeletion__header"]}>
            Delete tournament
          </h5>
          <p className={classes["submitDeletion__text"]}>
            Do you really want to delete chosen tournament?
          </p>
          <div className={classes["submitDeletion_btnRow"]}>
            <Button color="primary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              color="error"
              onClick={() => {
                props.deleteHandler();
                handleOpen();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Backdrop>
    </React.Fragment>
  );
};

export default DeleteTournamentButton;
