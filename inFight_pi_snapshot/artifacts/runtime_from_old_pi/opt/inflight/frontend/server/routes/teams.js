const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

// GET TEAM BY ID
router.get("/getbyid/:id", (req, res) => {
  console.time("GET /getbyid/:id");
  const { id } = req.params;
  const options = {
    method: "GET",
    url: `${API_URL}/team/`,
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
      console.log(error);
    });
});

// CREATE NEW TEAM
router.post("/add", (req, res) => {
  console.time("POST /add");
  const { name, number } = req.body;
  const options = {
    method: "POST",
    url: `${API_URL}/team/add`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      name,
      number,
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

//DELETE TEAM BY ID
router.post("/delete", (req, res) => {
  console.time("POST /delete");
  const options = {
    method: "POST",
    url: `${API_URL}/team/delete`,
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

//UPDATE TEAM BY ID
router.post("/update", (req, res) => {
  console.time("POST /update");
  console.log("update team req.body", req.body);
  const options = {
    method: "POST",
    url: `${API_URL}/team/update`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      id: req.body.id,
      number: req.body.number,
      name: req.body.name,
    },
  };

  axios
    .request(options)
    .then((response) => {
      console.log("update team with number:", req.body.number);
      res.json(response.data);
      console.timeEnd("POST /update");
    })
    .catch((error) => {
      console.log("1. Log error on POST /update :>> ", error);
      console.log(error);
    });
});

module.exports = router;
