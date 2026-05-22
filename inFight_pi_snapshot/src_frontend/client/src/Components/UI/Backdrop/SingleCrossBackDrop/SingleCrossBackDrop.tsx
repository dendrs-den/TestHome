import { Backdrop, Button } from "@mui/material";
import { MouseEventHandler } from "react";
import { CrossErrors } from "../../../../types/general_types";
import classes from "./SingleCrossBackDrop.module.scss";

type PropTypes = {
  open: boolean;
  onClick: MouseEventHandler;
  errorText: string;
};

const SingleCrossBackDrop = ({ open, onClick, errorText }: PropTypes) => {
  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 100 }}
      open={open}
    >
      <div className={classes.stopError__backDrop}>
        <div className={classes.backdrop_text}>
          {(errorText === CrossErrors.zeroCross ||
            errorText === CrossErrors.wrongState ||
            errorText === CrossErrors.wrongState2) && (
            <p>
              There was no crossing. Switching to{" "}
              <span className={classes.text_alarm}>Preparation mode</span>
            </p>
          )}
          {errorText === CrossErrors.singleCross && (
            <p>
              There was no second crossing of the sensor, the round was not
              saved. The system has been switched to the{" "}
              <span className={classes.text_alarm}>Preparation mode</span>
            </p>
          )}
          {errorText === CrossErrors.saveFailed && (
            <p>
              Round data was not saved due to a{" "}
              <span className={classes.text_alarm}>system error</span>. Please
              repeat the round save operation.
            </p>
          )}
        </div>
        <div className={classes.backdrop_btn_row}>
          <Button
            onClick={onClick}
            className={classes.ok_btn}
            variant="outlined"
            size="large"
          >
            OK
          </Button>
        </div>
      </div>
    </Backdrop>
  );
};

export default SingleCrossBackDrop;
