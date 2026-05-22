import { CircularProgress, Dialog } from "@mui/material";
import { Box } from "@mui/system";

const CircularProgressDialog = (props) => {
  return (
    <Dialog
      {...props}
      sx={{
        backgroundColor: "rgba(5, 18, 51, 0.30)",
        ".MuiPaper-root": {
          backgroundColor: "transparent",
          boxShadow: "none",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "6rem",
          height: "6rem",
        }}
      >
        <CircularProgress sx={{ color: "background.default" }} size="4rem" />
      </Box>
    </Dialog>
  );
};

export default CircularProgressDialog;
