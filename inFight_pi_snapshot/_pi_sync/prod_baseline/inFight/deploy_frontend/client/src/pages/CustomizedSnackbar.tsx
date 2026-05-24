import * as React from "react";
import Stack from "@mui/material/Stack";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

type Props = {
  severity?: "error" | "info" | "success" | "warning";
  message: string;
  autoHide?: number;
};

export default function CustomizedSnackbar({
  message,
  autoHide,
  severity,
}: Props) {
  const [open, setOpen] = React.useState(true);

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }

    setOpen(false);
  };

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <Snackbar
        open={open}
        autoHideDuration={autoHide | 4000}
        anchorOrigin={{ horizontal: "right", vertical: "top" }}
        onClose={handleClose}
      >
        <Alert
          onClose={handleClose}
          // severity={severity || "warning"}
          severity={severity}
          sx={{ width: "100%", maxWidth: "300px" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
