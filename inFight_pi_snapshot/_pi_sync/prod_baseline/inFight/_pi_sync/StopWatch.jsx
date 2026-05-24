import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import "./StopWatch.css";
import Timer from "./Timer";

function StopWatch({ isActive, isReset, firstCrossTime }) {
  const [time, setTime] = useState(
    firstCrossTime ? Math.trunc((Date.now() - firstCrossTime) / 100) * 100 : 0
  );
  const [thirdDig, setThirdDig] = useState(0);

  useEffect(() => {
    let interval = null;
    let interval2 = null;

    if (isActive) {
      interval = setInterval(() => {
        setTime((time) => time + 10);
      }, 10);
      interval2 = setInterval(() => {
        setThirdDig((time) => time + 1);
      }, 1);
    } else if (isReset) {
      setTime(0);
      setThirdDig(0);
    } else {
      clearInterval(interval);
      clearInterval(interval2);
    }
    return () => {
      clearInterval(interval);
      clearInterval(interval2);
    };
  }, [isActive, isReset]);

  return (
    <Box className="stop-watch">
      <Timer time={time} thirdDig={thirdDig} />
    </Box>
  );
}

export default StopWatch;
