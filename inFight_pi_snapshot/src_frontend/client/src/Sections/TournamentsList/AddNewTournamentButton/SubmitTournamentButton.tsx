import { Button } from "@mui/material";
import { MouseEventHandler } from "react";
import theme from "../../../styles/theme";

import classes from "./SubmitTournamentButton.module.scss";

type Props = {
  active: boolean;
  clickHandler: MouseEventHandler;
};

const SubmitTournamentButton = ({ active, clickHandler }: Props) => {
  return (
    <Button
      sx={{
        backgroundColor: theme.palette.primary.main,
        "&:hover": {
          backgroundColor: theme.palette.primary.light,
        },
      }}
      disabled={!active}
      variant="contained"
      className={classes.btnNext}
      onClick={clickHandler}
    >
      Next
    </Button>
  );
};

SubmitTournamentButton.defaultProps = {
  disabled: false,
};

export default SubmitTournamentButton;
