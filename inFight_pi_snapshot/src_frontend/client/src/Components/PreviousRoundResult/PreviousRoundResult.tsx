import { Box } from "@mui/material";
import formatTime from "../../utils/formatTime";
import { LastRound } from "../../types/general_types";

type Props = {
  roundInfo: LastRound;
};

const PreviousRoundResult = ({ roundInfo }: Props) => {
  return (
    <Box
      minWidth="240px"
      width="100%"
      maxWidth="640px"
      textAlign="right"
      fontSize="1.4rem"
    >
      <Box mt="6px">
        <Box
          display="flex"
          justifyContent="flex-end"
          sx={{
            fontSize: "clamp(56px, 5vw, 96px)",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontWeight: "bold" }}>
            {formatTime(roundInfo?.time_result).fullTime()}
          </span>
        </Box>
      </Box>
      <p style={{ textAlign: "right", margin: "14px 0 0 0" }}>Previous result</p>
    </Box>
  );
};

export default PreviousRoundResult;
