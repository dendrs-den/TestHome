import { Drawer, IconButton, styled } from "@mui/material";
import React, { useState } from "react";
import { Box } from "@mui/system";
import NavigationBlock from "../../InitialPage/NavigationBlock/NavigationBlock";
import MenuIcon from "@mui/icons-material/Menu";
import BlueToothButton from "../Buttons/BlueToothButton";
const StyledDrawer = styled(Drawer)(({ theme }) => ({}));

const BaseDrawer = (props) => {
  const [state, setState] = useState({
    left: false,
  });

  const toggleDrawer =
    (anchor, open, backdrop = false) =>
    (event) => {
      if (
        event.type === "keydown" &&
        (event.key === "Tab" || event.key === "Shift")
      ) {
        return;
      }
      if (props.changesMade && open === false) {
        return;
      }

      setState({ ...state, [anchor]: open });
    };

  const list = (anchor) => (
    <Box
      sx={{ auto: 250 }}
      role="presentation"
      onClick={toggleDrawer(anchor, false)}
    >
      <NavigationBlock
        onChangeContent={props.onChangeContent}
        changeBlockTitle={props.changeBlockTitle}
        changesMade={props.changesMade}
        setChangesMade={props.setChangesMade}
        toggleDrawer={toggleDrawer}
      />
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          left: "30px",
        }}
      >
        <BlueToothButton setOpenBluetooth={props.setOpenBluetooth} />
      </div>
    </Box>
  );

  return (
    <div>
      {["."].map((anchor) => (
        <React.Fragment key={anchor}>
          <IconButton onClick={toggleDrawer("left", true)}>
            <MenuIcon />
          </IconButton>
          <StyledDrawer
            anchor={"left"}
            open={state["left"]}
            onClose={toggleDrawer("left", false)}
          >
            {list("left")}
          </StyledDrawer>
        </React.Fragment>
      ))}
    </div>
  );
};

export default BaseDrawer;
