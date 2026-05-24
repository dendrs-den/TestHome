import { Button } from "@mui/material";
import { MouseEventHandler } from "react";
import theme from "../../../styles/theme";
import AdjustIcon from "@mui/icons-material/Adjust";

type Props = {
  className: string;
  clickHandler: MouseEventHandler;
};

const TrainingModeButton = ({ clickHandler, className }: Props) => {
  return (
    <Button
      // disabled={active}
      className={className}
      endIcon={<AdjustIcon />}
      sx={{
        "&": {
          color: theme.palette.primary.main,
          borderStyle: "dashed",
        },
        "&:hover": {
          borderStyle: "dashed",
        },
      }}
      variant="outlined"
      onClick={clickHandler}
    >
      Training
    </Button>
  );
};

export default TrainingModeButton;
