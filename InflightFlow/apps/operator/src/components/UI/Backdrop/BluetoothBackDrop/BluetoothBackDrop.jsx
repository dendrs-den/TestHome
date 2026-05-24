import { Backdrop, Button } from "@mui/material";
import React, { useState } from "react";
import classes from "./BluetoothBackDrop.module.scss";
import BlueToothTable from "../../../BlueTooth/BlueToothTable/BlueToothTable";
import RefreshIcon from "@mui/icons-material/Refresh";
import bluetoothDropSetKeys from "../../../../Api_requests/bluetooth/bluetoothDropSetKeys";

const BluetoothBackDrop = (props) => {
  const [currentDeviceMac, setCurrentDeviceMac] = useState(null);
  const [bustTextVisible, setVisibleBustText] = useState(true);
  const [skipTextVisible, setVisibleSkipText] = useState(false);
  const [toggleTextVisible, setVisibleToggleText] = useState(false);
  const [bindWindow, setBindWindow] = useState(false);

  const handleClose = (event) => {
    event.stopPropagation();

    props.setOpenBluetooth(false);
  };
  const closeBindingWindow = async (event) => {
    event.stopPropagation();
    await bluetoothDropSetKeys(currentDeviceMac);
    setBindWindow(false);
    toggleBustText(false);
    setVisibleSkipText(false);
  };

  const openBindingWindow = async (val) => {
    setBindWindow(val);
  };

  const toggleBustText = (val) => {
    setVisibleBustText(val);
  };
  const toggleSkipText = (val) => {
    setVisibleSkipText(val);
  };
  const toggleToggleText = (val) => {
    setVisibleToggleText(val);
  };

  const selectNewCurrentDeviceMac = (val) => {
    setCurrentDeviceMac(val);
  };

  const setBluetoothDataHandler = () => {
    props.fetchBluetoothData();
  };

  const refreshBtnHandler = async () => {
    console.log("refreshing bluetooth device list...");
    props.fetchBluetoothData();
    console.log("Bluetooth device list refreshed");
  };

  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 100 }}
      open={props.openBluetooth}
    >
      <div className={classes["bluetooth__window"]}>
        <div className={classes["bluetooth__header-row"]}>
          <h5 className={classes["bluetooth__header"]}>Bluetooth & USB</h5>
          <Button onClick={refreshBtnHandler} variant="text">
            <RefreshIcon style={{ color: "black" }}></RefreshIcon>
          </Button>
        </div>

        <div className={classes["bluetooth__datagrid"]}>
          <BlueToothTable
            devicesList={props.devicesList}
            setBluetoothDataHandler={setBluetoothDataHandler}
            openBindingWindow={openBindingWindow}
            selectNewCurrentDeviceMac={selectNewCurrentDeviceMac}
            toggleBustText={toggleBustText}
            toggleSkipText={toggleSkipText}
            toggleToggleText={toggleToggleText}
          />
        </div>
        <div className={classes["bluetooth__btnRow"]}>
          <Button
            onClick={handleClose}
            className={classes["bluetooth__confirmBtn"]}
            variant="contained"
          >
            Confirm
          </Button>
        </div>
      </div>

      <Backdrop
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 200 }}
        open={bindWindow}
      >
        <div className={classes["buttonManage__backdrop"]}>
          <h5 className={classes["buttonManage__header"]}>Selecting Buttons</h5>
          {bustTextVisible && (
            <p className={classes["buttonManage__text"]}>
              Press button which you want to use as "BUST"
            </p>
          )}
          {skipTextVisible && (
            <p className={classes["buttonManage__text"]}>
              Press button which you want to use as "SKIP"
            </p>
          )}
          {toggleTextVisible && (
            <p className={classes["buttonManage__text"]}>
              Press button which you want to use as "ACTIVATE/STOP"
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "end" }}>
            <Button
              onClick={closeBindingWindow}
              className={classes["buttonManage__btn"]}
              variant="text"
              color="error"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Backdrop>
    </Backdrop>
  );
};

export default BluetoothBackDrop;
