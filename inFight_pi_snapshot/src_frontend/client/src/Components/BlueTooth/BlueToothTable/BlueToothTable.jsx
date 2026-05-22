import classes from "./BlueToothTable.module.css";
import React from "react";
import { Box, Button } from "@mui/material";
import bluetoothConnect from "../../../Api_requests/bluetooth/bluetoothConnect";
import bluetoothRebind from "../../../Api_requests/bluetooth/bluetoothRebind";
import getAllBluetoothConnections from "../../../Api_requests/bluetooth/getAllConnections";
import bluetoothDisconnect from "../../../Api_requests/bluetooth/bluetoothDisconnect";
import setNextBtn from "../../../Api_requests/bluetooth/setNextBtn";
import ConnectBlueToothBtn from "../../UI/Buttons/ConnectBluetoothBtn";
import BaseDataGrid from "../../UI/BaseDataGrid/BaseDataGrid";

const BlueToothTable = (props) => {
  const { bluetoothDevices = [], connectedDevices = [], maps = [] } = props.devicesList;

  function compare(a, b) {
    if (a.support < b.support) {
      return 1;
    }
    if (a.support > b.support) {
      return -1;
    }
    return 0;
  }

  function findInConnectedByMac(mac) {
    const foundDevice = connectedDevices.find((dev) => dev.mac === mac);
    return foundDevice || {};
  }
  function findInMapsByMac(mac) {
    const { guid } = findInConnectedByMac(mac);
    const foundDevice = maps.find((dev) => dev.guid === guid);
    return foundDevice || false;
  }

  function deviceIsReady(mac) {
    const { ready } = findInMapsByMac(mac);
    return ready || false;
  }

  async function bindDevice(guid) {
    props.openBindingWindow(true);

    props.toggleBustText(true);
    const responseBust = await setNextBtn(guid, "bust");
    props.toggleBustText(false);

    if (responseBust.status) {
      props.toggleSkipText(true);
      const responseSkip = await setNextBtn(guid, "skip");
      props.toggleSkipText(false);

      if (responseSkip.status) {
        props.toggleToggleText(true);
        await setNextBtn(guid, "toggle");
      }
    }

    props.openBindingWindow(false);
    props.toggleToggleText(false);
  }

  const columns = [
    {
      field: "name",
      headerName: "Devices",
      maxWidth: 180,
      flex: 3,
    },
    {
      field: "connected",
      headerName: "Status",
      minWidth: 100,
      flex: 1,
    },

    {
      field: "unpair_button",
      maxWidth: 460,
      flex: 7,
      headerName: "",
      sortable: false,
      renderCell: (params) => {
        const onConnectClick = async (e) => {
          e.stopPropagation();

          const status = await bluetoothConnect(params.row.mac);

          props.setBluetoothDataHandler();

          const { guid } = params.row.guid !== undefined ? params.row : findInConnectedByMac(params.row.mac);

          if (status) {
            if (!deviceIsReady(params.row.mac)) {
              await bindDevice(guid);
            }
          }

          await getAllBluetoothConnections();

          return status;
        };
        const onDisconnectClick = async (e) => {
          e.stopPropagation();

          await bluetoothDisconnect(params.row.mac);
          await getAllBluetoothConnections();

          props.setBluetoothDataHandler();
        };

        const onRebindClick = async (e) => {
          e.stopPropagation();
          const { guid: deviceGuid } =
            params.row.guid !== undefined ? params.row : findInConnectedByMac(params.row.mac);
          console.log(deviceGuid);
          props.selectNewCurrentDeviceMac(deviceGuid);

          await bluetoothRebind(deviceGuid);

          await bindDevice(deviceGuid);
        };

        return (
          <React.Fragment>
            {[undefined, true].includes(params.row.support) && (
              <div className={classes["btn-row"]}>
                {params.row.connected && (
                  <Button onClick={onRebindClick} variant="outlined" className={classes["rebind-btn"]}>
                    Rebind
                  </Button>
                )}
                {params.row.connected && (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Button onClick={onDisconnectClick} variant="outlined" className={classes["disconnect-btn"]}>
                      Disconnect
                    </Button>
                  </Box>
                )}
                {!params.row.connected && <ConnectBlueToothBtn clickHandler={onConnectClick} />}
              </div>
            )}
            {params.row.support === false && (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "end",
                  color: "gray",
                  letterSpacing: ".1rem",
                  fontWeight: "normal",
                  "& p": {
                    paddingRight: "7px",
                  },
                }}
              >
                <p>Not supported</p>
              </Box>
            )}
          </React.Fragment>
        );
      },
    },
  ];

  const transformedData = bluetoothDevices
    ?.filter((device) => device.support)
    .map((device, i) => ({
      ...device,
      id: i,
      name: device.name.length > 18 ? device.name.slice(0, 18) + "..." : device.name,
    }));

  return (
    <React.Fragment>
      <Box height="480px" border="1px solid #d3d3d3">
        <BaseDataGrid
          sx={{
            "& .row_style.false": {
              backgroundColor: "lightGray",
              color: "gray",
            },
            "& .row_style.false:hover": {
              backgroundColor: "lightGray",
              color: "gray",
            },
          }}
          columns={columns}
          rows={transformedData?.sort(compare) || []}
          disableColumnMenu
          disableColumnFilter
          getRowClassName={(params) => {
            return `row_style ${params.row.support}`;
          }}
        />
      </Box>
    </React.Fragment>
  );
};

export default BlueToothTable;
