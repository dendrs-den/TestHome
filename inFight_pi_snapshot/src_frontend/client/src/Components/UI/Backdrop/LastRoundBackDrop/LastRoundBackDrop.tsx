import { Backdrop, Box, Button } from "@mui/material";
import { MouseEventHandler } from "react";
import classes from "./LastRoundBackDrop.module.scss";

type PropTypes = {
  open: boolean;
  onClick: MouseEventHandler;
};

const LastRoundBackDrop = ({ open, onClick }: PropTypes) => {
  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 100 }}
      open={open}
    >
      <Box className={classes.stopError__backDrop}>
        <Box className={classes.backdrop_text}>
          {/* <p>There was the last round!</p> */}
          <p>
            There is no next round. The system has been moved to the tournament
            page <span className={classes.text_alarm}>tournament page</span>
          </p>
        </Box>
        <Box className={classes.backdrop_btn_row}>
          <Button
            onClick={onClick}
            className={classes.ok_btn}
            variant="outlined"
            size="large"
          >
            OK
          </Button>
        </Box>
      </Box>
    </Backdrop>
  );
};

export default LastRoundBackDrop;
