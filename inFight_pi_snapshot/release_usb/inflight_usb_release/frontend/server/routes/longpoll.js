const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = "http://127.0.0.1:15010";

router.post("/start", (req, res) => {
  try {
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
      })
      .catch(() => {
        console.log("lp start error");
        res.status(500).send();
      });
  } catch (err) {
    console.log("lp start error");
    res.status(500).send();
  }
});

router.post("/tune", (req, res) => {
  try {
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
      })
      .catch(() => {
        console.log("lp tune error");
        res.status(500).send();
      });
  } catch (err) {
    console.log("lp tune error");
    res.status(500).send();
  }
});

router.post("/loop", (req, res) => {
  try {
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
      })
      .catch((error) => {
        // console.log("lp loop error 1", error);
        res.status(500).send();
      });
  } catch (err) {
    // console.log("lp loop error 2");
    res.status(500).send();
  }
});

module.exports = router;
