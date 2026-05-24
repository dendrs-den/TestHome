const express = require("express");
const Logger = require("../models/Logger");
const router = express.Router();
const axios = require("axios").default;
const SocketServer = require("../models/SocketServer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

// GET TOURNAMENTS LIST
router.get("/getall", (req, res) => {
  console.time("GET /getall");
  const options = {
    method: "GET",
    url: `${API_URL}/tournament/all`,
    headers: {
      "Content-Type": "application/json",
    },
  };
  axios
    .request(options)
    .then((response) => {
      res.json(response?.data || []);
      console.timeEnd("GET /getall");
    })
    .catch((error) => {
      console.log("1. Log error on GET /getall :>> ", error);
      console.log("An error occured during loading all tournaments:");
    });
});

// GET CURRENT TOURNAMENT
router.get("/getcurrent", (req, res) => {
  console.time("GET /getcurrent");
  const options = {
    method: "GET",
    url: `${API_URL}/tournament/current`,
    headers: {
      "Content-Type": "application/json",
    },
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      SocketServer.getSockets().forEach((socket) => {
        socket.emit("current_tournament", response.data);
      });
      console.timeEnd("GET /getcurrent");
    })
    .catch((error) => {
      console.log("1. Log error on GET /getcurrent :>> ", error);
      console.log(error);
    });
});

// CREATE NEW TOURNAMENT
router.post("/add", (req, res) => {
  console.time("POST /add");
  console.log("req.body  = ", req.body);
  const { body: tour } = req;
  const options = {
    method: "POST",
    url: `${API_URL}/tournament/add`,
    data: {
      name: tour.name,
      teams: tour.teams,
      disciplines: tour.disciplines,
      stages: tour.stages,
      bust_value: tour.bust_value,
      skip_value: tour.skip_value,
    },
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("POST /add");
    })
    .catch((error) => {
      console.log("1. Log error on POST /add :>> ", error);
      console.log(error);
    });
});

// DELETE TOURNAMENT BY ID
router.post("/delete", (req, res) => {
  console.time("POST /delete");
  const options = {
    method: "POST",
    url: `${API_URL}/tournament/delete`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      id: req.body.id,
    },
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("POST /delete");
    })
    .catch((error) => {
      console.log("1. Log error on POST /delete :>> ", error);
      console.log(error);
    });
});

// UPDATE TOURNAMENT BY ID
router.post("/update", (req, res) => {
  console.time("POST /update");
  const options = {
    method: "POST",
    url: `${API_URL}/tournament/update`,
    headers: {
      "Content-Type": "application/json",
    },
    data: req.body,
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("POST /update");
    })
    .catch((error) => {
      console.log("1. Log error on POST /update :>> ", error);
      if (error.response) {
        console.log(`error while updating tournament ${req.body.name}  status: ${error.response.status}`);
        console.log(`status: ${error.response.status}`);
        console.log(`data: ${error.response.data}`);
        res.send({ status: error.response.status });
      }
    });
});

// UPDATE  CURRENT TOURNAMENT BY ID (able to add, edit and delete rounds)
router.post("/current/update", (req, res) => {
  console.time("POST /current/update");
  console.log("current tournament update data: ", req.body);
  const options = {
    method: "POST",
    url: `${API_URL}/tournament/current/update`,
    headers: {
      "Content-Type": "application/json",
    },
    data: req.body,
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("POST /current/update");
    })
    .catch((error) => {
      console.log("1. Log error on POST /current/update :>> ", error);
      if (error.response) {
        console.log(
          `error while updating current tournament ${req.body.name}.  status: ${error.response.status}`,
        );
        res.send({ status: error.response.status });
      }
    });
});

router.post("/training", (req, res) => {
  console.time("POST /training");
  const options = {
    method: "POST",
    url: `${API_URL}/tournament/test`,
    headers: {
      "Content-Type": "application/json",
    },
  };
  console.log("Set training");
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      SocketServer.getSockets().forEach((socket) => {
        socket.emit("set_training", response.data);
      });
      console.timeEnd("POST /training");
    })
    .catch((error) => {
      console.log("1. Log error on POST /training :>> ", error);
      console.log("An error occured during set training");
    });
});

// SET TOURNAMENT AS CURRENT BY ID
router.post("/current", (req, res) => {
  console.time("POST /current");
  const options = {
    method: "POST",
    url: `${API_URL}/tournament/current`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      id: req.body.id,
    },
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("POST /current");
    })
    .catch((error) => {
      console.log("1. Log error on POST /current :>> ", error);
      console.log(error);
    });
});

module.exports = router;
