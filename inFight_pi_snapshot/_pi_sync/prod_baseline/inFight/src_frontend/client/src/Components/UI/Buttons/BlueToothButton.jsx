import { Button } from "@mui/material";

const BlueToothButton = (props) => {
  return (
    <Button
      sx={{
        "&": {
          backgroundColor: "#FFF",
          transition: "transform 0.3s",
          borderStyle: "dashed",
          textTransform: "capitalize",
          fontSize: "18px",
          fontWeight: "300",
          zIndex: "300",
        },
        "&:hover": {
          borderStyle: "dashed",
          transform: "scale(1.1)",
        },
      }}
      variant="outlined"
      color="info"
      onClick={() => {
        props.setOpenBluetooth(true);
      }}
    >
      Devices
    </Button>
  );
};

export default BlueToothButton;
