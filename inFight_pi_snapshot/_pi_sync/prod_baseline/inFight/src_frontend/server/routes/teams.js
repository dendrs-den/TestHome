const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://127.0.0.1:15000";
const handleApiError = (res, error, context) => {
  const status = error?.response?.status || 502;
  const details = error?.response?.data || error?.message || "Unknown error";
  console.log(`${context}:`, details);
  return res.status(status).json({ error: context, details });
};

// GET TEAM BY ID
router.get("/getbyid/:id", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(res, error, "Get team by id failed");
    });
});

// CREATE NEW TEAM
router.post("/add", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(res, error, "Create team failed");
    });
});

//DELETE TEAM BY ID
router.post("/delete", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(res, error, "Delete team failed");
    });
});

//UPDATE TEAM BY ID
router.post("/update", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(res, error, "Update team failed");
    });
});

module.exports = router;
