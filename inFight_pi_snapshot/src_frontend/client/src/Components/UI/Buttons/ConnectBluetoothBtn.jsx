import { Alert, Box, Button, CircularProgress, Fade } from "@mui/material";
import React, { useState } from "react";

const ConnectBlueToothBtn = (props) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = React.useState(null);

  const handleButtonClick = async (e) => {
    setStatus(null);
    setLoading(true);
    const status = await props.clickHandler(e);
    setTimeout(() => {
      setStatus(null);
    }, 1000);
    setLoading(false);

    setStatus(status);
  };

  const buttonSx = {
    "&:hover": {
      color: " #562CFF",
      borderColor: "#562CFF",
      backgroundColor: "rgba(86, 44, 255, 0.1)",
    },
    color: " #562CFF",
    borderColor: "#562CFF",
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Fade in={status === false}>
        <Alert
          sx={{
            backgroundColor: "transparent",
          }}
          severity="error"
        >
          Couldn't connect
        </Alert>
      </Fade>

      <Box sx={{ m: 1, position: "relative" }}>
        <Button variant="outlined" sx={buttonSx} disabled={loading} onClick={handleButtonClick}>
          Connect
        </Button>
        {loading && (
          <CircularProgress
            size={24}
            sx={{
              color: "#562CFF",
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: "-12px",
              marginLeft: "-12px",
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default ConnectBlueToothBtn;
