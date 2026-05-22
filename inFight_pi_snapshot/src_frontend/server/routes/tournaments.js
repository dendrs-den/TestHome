const express = require("express");
const Logger = require("../models/Logger");
const router = express.Router();
const axios = require("axios").default;
const SocketServer = require("../models/SocketServer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = "http://127.0.0.1:15010";

const handleApiError = (res, error, context) => {
  const status = error?.response?.status || 502;
  const details = error?.response?.data || error?.message || "Unknown error";
  console.log(`${context}:`, details);
  return res.status(status).json({
    error: context,
    details,
  });
};

// GET TOURNAMENTS LIST
router.get("/getall", (req, res) => {
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
      res.json(response.data);
    })
    .catch((error) => {
      return handleApiError(
        res,
        error,
        "An error occured during loading all tournaments"
      );
    });
});

// GET CURRENT TOURNAMENT
router.get("/getcurrent", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(
        res,
        error,
        "An error occured during loading current tournament"
      );
    });
});

// CREATE NEW TOURNAMENT
router.post("/add", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(
        res,
        error,
        "An error occured during creating tournament"
      );
    });
});

// DELETE TOURNAMENT BY ID
router.post("/delete", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(
        res,
        error,
        "An error occured during deleting tournament"
      );
    });
});

// UPDATE TOURNAMENT BY ID
router.post("/update", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(res, error, "An error occured during updating tournament");
    });
});

// UPDATE  CURRENT TOURNAMENT BY ID (able to add, edit and delete rounds)
router.post("/current/update", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(
        res,
        error,
        "An error occured during updating current tournament"
      );
    });
});

router.post("/training", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(res, error, "An error occured during set training");
    });
});

// SET TOURNAMENT AS CURRENT BY ID
router.post("/current", (req, res) => {
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
    })
    .catch((error) => {
      return handleApiError(
        res,
        error,
        "An error occured during setting current tournament"
      );
    });
});

module.exports = router;
