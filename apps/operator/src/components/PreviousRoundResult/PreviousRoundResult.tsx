// @ts-nocheck
import { Box } from "@mui/material";
import formatTime from "../../utils/formatTime";
import { LastRound } from "../../types/general_types";

type Props = {
  roundInfo: LastRound;
};

const PreviousRoundResult = ({ roundInfo }: Props) => {
  return (
    <Box minWidth="240px" fontSize="1.4rem">
      <Box mt="10px">
        <Box display="flex" fontSize="130px" justifyContent="space-between">
          <span style={{fontWeight: "bold"}}>
            {formatTime(roundInfo?.time_result).fullTime()}
          </span>
        </Box>
      </Box>
      <p style={{ textAlign: "center" }}>Previous result</p>
    </Box>
  );
};

export default PreviousRoundResult;
