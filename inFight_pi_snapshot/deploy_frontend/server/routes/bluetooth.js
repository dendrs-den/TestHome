const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const SocketServer = require("../models/SocketServer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

// GET ALL (deviceList)
router.get("/getall", (req, res) => {
  try {
    console.time("GET /getall");
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
        console.timeEnd("GET /getall");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getall :>> ", error);
        console.log("Error trying to get device list");
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getall :>> ", error.response);
      console.log("Error trying to get device list", error.response);
    }
    res.status(500).send();
  }
});

// CONNECT (by mac address)
router.get("/connect/:mac", (req, res) => {
  try {
    console.time("GET /connect/:mac");
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
        console.timeEnd("GET /connect/:mac");
      })
      .catch((error) => {
        console.log("1. Log error on GET /connect/:mac :>> ", error);
        console.log("Something went wrong", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /connect/:mac :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// DISCONNECT (by mac address)
router.get("/disconnect/:mac", (req, res) => {
  try {
    console.time("GET /disconnect/:mac");
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
        console.timeEnd("GET /disconnect/:mac");
      })
      .catch((error) => {
        console.log("1. Log error on GET /disconnect/:mac :>> ", error);
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /disconnect/:mac :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// WAIT FOR BLUETOOTH FAULT
router.get("/waitfault", (req, res) => {
  try {
    console.time("GET /waitfault");
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
        res.json(response.data);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("bluetooth_fault", response.data);
        });
        console.timeEnd("GET /waitfault");
      })
      .catch((error) => {
        console.log("1. Log error on GET /waitfault :>> ", error);
        console.log("error during waiting for fault", error.status);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /waitfault :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// BIND NEXT PRESSED KEY
router.get("/bind/:guid/:type", (req, res) => {
  try {
    console.time("GET /bind/:guid/:type");
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
        console.timeEnd("GET /bind/:guid/:type");
      })
      .catch((error) => {
        console.log("1. Log error on GET /bind/:guid/:type :>> ", error);
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /bind/:guid/:type :>> ", error.response);
      console.log("failed to bind key", error.response);
    }
    res.status(500).send();
  }
});

// DROP KEYS
router.get("/dropkeys/:mac", (req, res) => {
  try {
    console.time("GET /dropkeys/:mac");
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
        console.timeEnd("GET /dropkeys/:mac");
      })
      .catch((error) => {
        console.log("1. Log error on GET /dropkeys/:mac :>> ", error);
        console.log(error);
      });
  } catch (error) {
    console.log("2. Log error.response on GET /dropkeys/:mac :>> ", error.response);
    console.log("failed to drop keys", error.status);
    res.status(500).send();
  }
});

// DROP SET KEYS (CANCEL WAITING FOR BUTTONS)
router.get("/dropSetKeys/:mac", (req, res) => {
  try {
    console.time("GET /dropSetKeys/:mac");
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
        console.timeEnd("GET /dropSetKeys/:mac");
      })
      .catch((error) => {
        console.log("1. Log error on GET /dropSetKeys/:mac :>> ", error);
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /dropSetKeys/:mac :>> ", error.response);
      console.log("failed to  dropSetKeys", error.response);
    }
    res.status(500).send();
  }
});

module.exports = router;
