const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const SocketServer = require("../models/SocketServer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = (process.env.CORE_API_URL || "http://127.0.0.1:15000").trim();
const EMPTY_BT_PAYLOAD = {
  bluetoothDevices: [],
  connectedDevices: [],
  maps: [],
};

const handleApiError = (res, error, context) => {
  const status = error?.response?.status || 502;
  const details = error?.response?.data || error?.message || "Unknown error";
  console.log(context, details);
  return res.status(status).json({ error: context, details });
};

// GET ALL (deviceList)
router.get("/getall", (req, res) => {
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/device/getAll`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        console.log("Successfully loaded device list");
        res.json(response.data);
      })
      .catch((error) => {
        console.log(
          "Bluetooth service unavailable, returning empty list",
          error?.response?.data || error?.message || error
        );
        return res.status(200).json(EMPTY_BT_PAYLOAD);
      });
  } catch (error) {
    console.log("Error trying to get device list", error?.message || error);
    return res.status(200).json(EMPTY_BT_PAYLOAD);
  }
});

// CONNECT (by mac address)
router.get("/connect/:mac", (req, res) => {
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/device/connect/${req.params.mac}`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {},
    };

    axios
      .request(options)
      .then((response) => {
        console.log("connected device with mac: ", req.params.mac);
        res.json(response.data);
      })
      .catch((error) => {
        console.log("Something went wrong", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// DISCONNECT (by mac address)
router.get("/disconnect/:mac", (req, res) => {
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/device/disconnect/${req.params.mac}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// WAIT FOR BLUETOOTH FAULT
router.get("/waitfault", (req, res) => {
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/round/fault/remote`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        console.log("got a fault");
        res.json(response.data);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("bluetooth_fault", response.data);
        });
      })
      .catch((error) => {
        console.log("error during waiting for fault", error.status);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// BIND NEXT PRESSED KEY
router.get("/bind/:guid/:type", (req, res) => {
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/device/nextKey/${req.params.guid}/${req.params.type}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("failed to bind key", error.response);
    }
    res.status(500).send();
  }
});

// DROP KEYS
router.get("/dropkeys/:mac", (req, res) => {
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/device/dropKeys/${req.params.mac}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.log("failed to drop keys", error.status);
    res.status(500).send();
  }
});

// DROP SET KEYS (CANCEL WAITING FOR BUTTONS)
router.get("/dropSetKeys/:mac", (req, res) => {
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/device/dropSetKeys/${req.params.mac}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("failed to  dropSetKeys", error.response);
    }
    res.status(500).send();
  }
});

module.exports = router;

