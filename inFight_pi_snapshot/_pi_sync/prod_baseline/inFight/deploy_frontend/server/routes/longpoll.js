const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

router.post("/start", (req, res) => {
  try {
    console.time("POST /start");
    const options = {
      method: "POST",
      url: `${API_URL}/lp/start`,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(req.body),
    };

    axios
      .request(options)
      .then((response) => {
        console.log("LP start", response.data);

        res.json(response.data);
        console.timeEnd("POST /start");
      })
      .catch((error) => {
        console.log("1. Log error on POST /start :>> ", error);
        console.log("lp start error");
        res.status(500).send();
      });
  } catch (err) {
    console.log("2. Log error.response on POST /start :>> ", err.response);
    console.log("lp start error");
    res.status(500).send();
  }
});

router.post("/tune", (req, res) => {
  try {
    console.time("POST /tune");
    const options = {
      method: "POST",
      url: `${API_URL}/lp/tune`,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(req.body),
    };

    axios
      .request(options)
      .then((response) => {
        console.log("LP tune", response.data);
        res.json(response.data);
        console.timeEnd("POST /tune");
      })
      .catch((error) => {
        console.log("1. Log error on POST /tune :>> ", error);
        console.log("lp tune error");
        res.status(500).send();
      });
  } catch (err) {
    console.log("2. Log error.response on POST /tune :>> ", err.response);
    console.log("lp tune error");
    res.status(500).send();
  }
});

router.post("/loop", (req, res) => {
  try {
    console.time("POST /loop");
    const options = {
      method: "POST",
      url: `${API_URL}/lp/loop`,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(req.body),
    };

    axios
      .request(options)
      .then((response) => {
        // console.log("LP loop", response.data);
        res.json(response.data);
        console.timeEnd("POST /loop");
      })
      .catch((error) => {
        console.log("1. Log error on POST /loop :>> ", error);
        // console.log("lp loop error 1", error);
        res.status(500).send();
      });
  } catch (err) {
    console.log("2. Log error.response on POST /loop :>> ", err.response);
    // console.log("lp loop error 2");
    res.status(500).send();
  }
});

module.exports = router;
