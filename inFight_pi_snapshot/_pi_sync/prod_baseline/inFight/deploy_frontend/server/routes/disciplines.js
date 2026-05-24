const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

//GET DISCIPLINE BY ID
router.get("/getbyid/:id", (req, res) => {
  console.log(req.params);

  console.time("GET /getbyid/:id");

  const { id } = req.params;
  const options = {
    method: "GET",
    url: `${API_URL}/disciplines/`,
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

// CREATE NEW DISCIPLINE
router.post("/add", (req, res) => {
  console.timeEnd("POST /add");

  const options = {
    method: "POST",
    url: `${API_URL}/disciplines/add`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      name: req.body.name,
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
      console.log("error");
    });
});

// DELETE DISCIPLINE BY ID
router.post("/delete", (req, res) => {
  console.time("POST /delete");
  const options = {
    method: "POST",
    url: `${API_URL}/disciplines/delete`,
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

//UPDATE DISCIPLINE BY ID
router.post("/update", (req, res) => {
  console.time("POST /update");
  const options = {
    method: "POST",
    url: `${API_URL}/disciplines/update`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      id: req.body.id,
      name: req.body.name,
    },
  };

  axios
    .request(options)
    .then((response) => {
      console.log("updated discipline:", req.body);
      res.json(response.data);
      console.timeEnd("POST /update");
    })
    .catch((error) => {
      console.log("1. Log error on POST /update :>> ", error);
      console.log(error);
    });
});

module.exports = router;
