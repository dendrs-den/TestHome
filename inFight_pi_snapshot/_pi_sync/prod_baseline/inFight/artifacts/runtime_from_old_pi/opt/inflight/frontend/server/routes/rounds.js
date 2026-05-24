const { response } = require("express");
const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const SocketServer = require("../models/SocketServer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

// START ROUND (ACTIVATE BUTTON)
router.post("/start", (req, res) => {
  console.time("POST /start");
  const options = {
    method: "POST",
    url: `${API_URL}/round/start?debug=${false}`,
    headers: {
      "Content-Type": "application/json",
    },
  };

  SocketServer.getSockets().forEach((socket) => {
    socket.emit("stateStart", "");
  });
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.log("start round request success");

      SocketServer.getSockets().forEach((socket) => {
        socket.emit("stopWatch_start", "");
      });
      console.timeEnd("POST /start");
    })
    .catch((error) => {
      console.log("1. Log error on POST /start :>> ", error);
      console.log("failed to start round with terminal");
    });
});

// START ROUND REMOTELY
router.get("/activate_remotely", (req, res) => {
  try {
    console.time("POST /activate_remotely");
    const options = {
      method: "GET",
      url: `${API_URL}/round/start/bluetooth/remote`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.log("start round remotely success", response.data);
        if (response.data) {
          SocketServer.getSockets().forEach((socket) => {
            socket.emit("stateStart", "");
          });
        }
        console.timeEnd("POST /activate_remotely");
        return;
      })
      .catch((error) => {
        console.log(response.status);
        console.log("1. Log error on POST /activate_remotely :>> ", error);
        console.log("failed to remotely start round", error);
        res.status(500).send();
      });
  } catch (error) {
    console.log("2. Log error.response on POST /activate_remotely :>> ", error.response);
    console.log("error trying to remotely activate round", error);
  }
});

// WAIT FOR CROSS REMOTELY
router.get("/first_cross_remotely", (req, res) => {
  try {
    console.time("POST /first_cross_remotely");
    const options = {
      method: "GET",
      url: `${API_URL}/round/start/crossing/remote`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then(({ data }) => {
        res.json(data);
        console.log("start round request success: ", data);
        if (data?.cross !== 0) {
          SocketServer.getSockets().forEach((socket) => {
            socket.emit("stopWatch_start", "");
          });
        }
        console.timeEnd("POST /first_cross_remotely");
      })
      .catch((error) => {
        console.log("1. Log error on POST /first_cross_remotely :>> ", error);
        console.log("failed to receive first cross", error);
      });
  } catch (error) {
    console.log("2. Log error.response on POST /first_cross_remotely :>> ", error.response);
    console.log("failed to get first cross", error);
  }
});

// END ROUND (STOP BUTTON)
router.post("/end", (req, res) => {
  console.time("POST /end");
  const options = {
    method: "POST",
    url: `${API_URL}/round/end`,
    headers: {
      "Content-Type": "application/json",
    },
  };
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.log("end round request success: ", data);

      SocketServer.getSockets().forEach((socket) => {
        socket.emit("stateStop", response.data);
      });
      console.timeEnd("POST /end");
    })
    .catch((error) => {
      console.log("1. Log error on POST /end :>> ", error);
      if (error.response) {
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("stopWithError", "");
        });
        console.log(error.response.data);
        res.send({ text: error.response.data }); // => the response payload
      }
    });
});

// END ROUND REMOTE
router.get("/stop_remotely", (req, res) => {
  try {
    console.time("POST /stop_remotely");
    const options = {
      method: "GET",
      url: `${API_URL}/round/end/remote`,
      timeout: 300000,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        console.log("fulfilled stop : ", response.data);
        res.status(200).json(response.data);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("stateStop", response.data);
        });
        console.timeEnd("POST /stop_remotely");
      })
      .catch((error) => {
        console.log("1. Log error.response on POST /stop_remotely :>> ");
        if (error.response) {
          SocketServer.getSockets().forEach((socket) => {
            socket.emit("stopWithError", "");
          });
          console.log("caught error remote stop: ", error.response.data);
          res.status(200).send(error.response.data); // => the response payload
        }
      });
  } catch (error) {
    console.log("2. Log error.response on POST /stop_remotely :>> ", error.response);
    console.log("failed to remotely stop round", error.response);
  }
});

// REPLAY ROUND
router.post("/replay", (req, res) => {
  console.time("POST /replay");
  const options = {
    method: "POST",
    url: `${API_URL}/round/replay`,
    headers: {
      "Content-Type": "application/json",
    },
  };
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeEnd("POST /replay");
      console.log("replay round request success");
    })
    .catch((error) => {
      console.log("1. Log error on POST /replay :>> ", error);
      console.log("error");
    });
});

// NEXT ROUND
router.post("/set/next", (req, res) => {
  console.time("POST /set/next");
  const options = {
    method: "POST",
    url: `${API_URL}/round/set/next`,
    headers: {
      "Content-Type": "application/json",
    },
  };
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.timeLog("POST /set/next", "First");
      console.log("setting next round request success");
    })
    .catch((error) => {
      console.log("1. Log error on POST /set/next :>> ", error);
      console.log("error during setting next round");
      res.status(500).send({ status: error.response.data?.status });
    })
    .then(() => {
      SocketServer.getSockets().forEach((socket) => {
        socket.emit("nextRound");
      });
      console.timeEnd("POST /set/next");
    });
});
// SET EXACT ROUND
router.post("/set/:poss", (req, res) => {
  console.time("POST /set/:poss");
  const { poss } = req.params;

  const options = {
    method: "POST",
    url: `${API_URL}/round/set/${poss}`,

    headers: {
      "Content-Type": "application/json",
    },
  };
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.log(`setting ${poss} round request success`);
      console.timeLog("POST /set/:poss", "Second");
    })
    .catch((error) => {
      console.log("1. Log error on POST /set/:poss :>> ", error);
      console.log("error trying to set current round");
    })
    .then(() => {
      SocketServer.getSockets().forEach((socket) => {
        socket.emit("nextRound");
      });
      console.timeEnd("POST /set/:poss");
    });
});

// SWAP ROUND POSITIONS IN TOURNAMENT BY INDEXES
router.post("/swap", (req, res) => {
  console.time("POST /swap");
  console.log("swap", req);
  const options = {
    method: "POST",
    url: `${API_URL}/round/swap`,
    data: req.body,
    headers: {
      "Content-Type": "application/json",
    },
  };
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.log("swap commands request success");
      console.timeEnd("POST /swap");
    })
    .catch((error) => {
      console.log("1. Log error on POST /swap :>> ", error);
      console.log("swap commands error");
    });
});

// UPDATE ROUND'S TEAM (FOR SELECTING )
router.post("/updateTeam", (req, res) => {
  console.time("POST /updateTeam");
  console.log("update team req:", req);
  const { roundIndex, teamId } = req.body;
  const options = {
    method: "POST",
    url: `${API_URL}/round/${roundIndex}/update/team`,
    data: {
      id: teamId,
    },
    headers: {
      "Content-Type": "application/json",
    },
  };
  axios
    .request(options)
    .then((response) => {
      res.json(response.data);
      console.log("swap commands request success");
      console.timeEnd("POST /updateTeam");
    })
    .catch((error) => {
      console.log("1. Log error on POST /updateTeam :>> ", error);
      console.log("swap commands error");
    });
});

module.exports = router;
