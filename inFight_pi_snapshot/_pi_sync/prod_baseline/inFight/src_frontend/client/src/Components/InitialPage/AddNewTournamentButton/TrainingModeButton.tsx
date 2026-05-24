import { Button } from "@mui/material";
import { MouseEventHandler } from "react";
import theme from "../../../styles/theme";
import AdjustIcon from "@mui/icons-material/Adjust";

type Props = {
  clickHandler: MouseEventHandler;
};

const TrainingModeButton = ({ clickHandler }: Props) => {
  return (
    <Button
      endIcon={<AdjustIcon />}
      sx={{
        "&": {
          color: theme.palette.primary.main,
          // color: "#FFFFFF",
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
