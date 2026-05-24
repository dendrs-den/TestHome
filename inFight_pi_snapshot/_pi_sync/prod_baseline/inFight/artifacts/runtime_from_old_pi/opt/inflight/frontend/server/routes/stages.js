const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

// GET STAGE BY ID
router.get("/getbyid/:id", (req, res) => {
  console.time("GET /getbyid/:id");
  const { id } = req.params;
  const options = {
    method: "GET",
    url: `${API_URL}/stage/`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      id: id,
    },
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("GET /getbyid/:id");
    })
    .catch((error) => {
      console.log("1. Log error on GET /getbyid/:id :>> ", error);
      console.log("error");
    });
});

// CREATE NEW STAGE
router.post("/add", (req, res) => {
  console.time("POST /add");
  const options = {
    method: "POST",
    url: `${API_URL}/stage/add`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      name: req.body.name,
      battle: req.body.battle,
    },
  };

  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("POST /add");
    })
    // .then(() => {
    //   SocketServer.getSockets().forEach((socket) => socket.emit())
    // })
    .catch((error) => {
      console.log("1. Log error on POST /add :>> ", error);
      console.log(error);
    });
});

// DELETE STAGE BY ID
router.post("/delete", (req, res) => {
  console.time("POST /delete");
  const options = {
    method: "POST",
    url: `${API_URL}/stage/delete`,
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
  // .then(() => {
  //   SocketServer.getSockets().forEach((socket) => socket.emit())
  // })
});

//UPDATE STAGE BY ID
router.post("/update", (req, res) => {
  console.time("POST /update");
  console.log("update stage req.body", req.body);
  const options = {
    method: "POST",
    url: `${API_URL}/stage/update`,
    headers: {
      "Content-Type": "application/json",
    },
    data: req.body,
  };

  axios
    .request(options)
    .then((response) => {
      console.log("update stage :", req.body);
      res.json(response.data);
      console.timeEnd("POST /update");
    })
    .catch((error) => {
      console.log("1. Log error on POST /update :>> ", error);
      // console.log(`an error while updating stage ${req.body.id} : `, error);
      if (error.response) {
        console.log(`error response`, error.response.data);
        console.log(`error status`, error.response.status);
        console.log(`error headers`, error.response.headers);
        res.send({ error: { data: error.response.data, status: error.response.status } });
      }
    });
});

module.exports = router;
