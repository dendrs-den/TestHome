import { Box } from "@mui/material";
import { useEffect } from "react";
import TrainingModeControls from "./TrainingModeControls";

const TrainingModePanel = (props) => {
  const { changeBlockTitle, changeContent } = props;

  useEffect(() => {
    changeBlockTitle("Training Mode !".toUpperCase());
  }, [changeBlockTitle]);

  return (
    <Box padding="20px 0 30px 0" maxWidth="1200px" margin="auto">
      <TrainingModeControls
        changeContent={changeContent}
        changeBlockTitle={changeBlockTitle}
      />
    </Box>
  );
};

export default TrainingModePanel;
