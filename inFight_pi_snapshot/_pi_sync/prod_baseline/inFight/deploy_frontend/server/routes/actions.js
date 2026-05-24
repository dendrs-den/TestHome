const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const SocketServer = require("../models/SocketServer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = process.env.CORE_API_URL || "http://192.168.21.190:15000";

// SEND BUST (WEB)
router.post("/sendbust", (req, res) => {
  try {
    console.time("POST sendbust");
    const options = {
      method: "POST",
      timeout: 10000,
      url: `${API_URL}/round/fault`,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(req.body),
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        if (response.data.valid === true) {
          SocketServer.getSockets().forEach((socket) => {
            socket.emit("bust", options.data);
          });
        }
        if (req.body.time) {
          SocketServer.getSockets().forEach((socket) => {
            socket.emit("getInfo", null);
          });
        }
        console.timeEnd("POST sendbust");
      })
      .catch((error) => {
        console.Console.log("1. Log error on POST /sendbust :>> ", error);
        console.log("fault error 1 : ", error);
        res.status(500).send();
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on POST /sendbust :>> ", error.response);
      console.log("fault error 2 :", error.response.data);
    }
    res.status(500).send();
  }
});

// SEND SKIP (WEB)
router.post("/sendskip", (req, res) => {
  try {
    console.time("POST sendskip");
    const options = {
      method: "POST",
      timeout: 10000,
      url: `${API_URL}/round/fault`,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(req.body),
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        if (response.data.valid === true) {
          SocketServer.getSockets().forEach((socket) => {
            socket.emit("skip", options.data);
          });
        }
        if (req.body.time) {
          SocketServer.getSockets().forEach((socket) => {
            socket.emit("getInfo", null);
          });
        }
        console.timeEnd("POST sendskip");
      })
      .catch((error) => {
        console.log("1. Log error on POST /sendskip :>> ", error);
        console.log("skip error 1 : ", error);
        res.status(500).send();
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on POST /sendskip :>> ", error.response);
      console.log("skip error 2 :", error.response);
    }
    res.status(500).send();
  }
});

// SET STATE PREPARE
router.post("/setPrepare", (req, res) => {
  try {
    console.time("POST setPrepare");
    const options = {
      method: "POST",
      url: `${API_URL}/state/set/prepare`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeLog("POST setPrepare", "First");
      })
      .catch((error) => {
        console.log("1. Log error on POST /setPrepare :>> ", error);
        console.log(error);
      })
      .then(() => {
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("statePrepare", "");
          socket.emit("nextRound");
        });
        console.timeEnd("POST setPrepare");
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on POST /setPrepare :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// SET ADMINISTRATION STATE
router.post("/setAdministration", (req, res) => {
  try {
    console.time("POST setAdministration");
    const options = {
      method: "POST",
      url: `${API_URL}/state/set/administration`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeLog("POST setAdministration", "First");
      })
      .catch((error) => {
        console.log("1. Log error on POST /setAdministration :>> ", error);
        console.log(error);
      })
      .then(() => {
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("stateAdministration", {});
        });
        console.timeEnd("POST setAdministration");
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on POST /setAdministration :>> ", error.response);
      console.log(error.response);
    }
    res.status(400);
  }
});

// SET ROUND INFO

// GET INFO
router.get("/getinfo", (req, res) => {
  try {
    console.time("GET /getinfo");
    const options = {
      method: "GET",
      url: `${API_URL}/round/info`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("relevantData", response.data);
        });
        console.timeEnd("GET /getinfo");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getinfo :>> ", error);
        console.log("an error while getting info :", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getinfo :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});
// GET INFO
router.get("/getCurrentRound", (req, res) => {
  console.time("GET /getCurrentRound");
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/round/current`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /getCurrentRound");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getCurrentRound :>> ", error);
        console.log("an error while getting current round :", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getCurrentRound :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// SAVE ROUND
router.get("/saveround", (req, res) => {
  try {
    console.time("GET /saveround");
    const options = {
      method: "GET",
      url: `${API_URL}/round/save`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /saveround");
      })
      .catch((error) => {
        console.log("1. Log error on GET /saveround :>> ", error);
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /saveround :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET ROUND RESULTS (GET ALL FAULTS)
router.get("/getallfaults", (req, res) => {
  console.time("GET /getallfaults");
  try {
    const options = {
      method: "GET",
      url: `${API_URL}/round/fault`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /getallfaults");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getallfaults :>> ", error);
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getallfaults :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// EDIT FAULT (both for editing and deleting)
router.post("/editfaults", (req, res) => {
  try {
    console.time("POST /editfaults");
    const options = {
      method: "POST",
      url: `${API_URL}/round/fault/edit`,
      headers: {
        "Content-Type": "application/json",
      },
      data: req.body,
    };
    axios
      .request(options)
      .then((response) => {
        console.log("managed to update faults list");
        res.json(response.data);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("getInfo", response.data);
        });
        console.timeEnd("POST /editfaults");
      })
      .catch((error) => {
        console.log("1. Log error on POST /editfaults :>> ", error);
        console.log("error during editing fault:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on POST /editfaults :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET ALL CROSSES
router.get("/getallCrosses", (req, res) => {
  try {
    console.time("GET /getallCrosses");
    const options = {
      method: "GET",
      url: `${API_URL}/round/crossed`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /getallCrosses");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getallCrosses :>> ", error);
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getallCrosses :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET NEXT CROSS
router.get("/getCrossRemote", (req, res) => {
  try {
    console.time("GET /getCrossRemote");
    const options = {
      method: "GET",
      url: `${API_URL}/round/crossed/remote`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /getCrossRemote");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getCrossRemote :>> ", error);
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getCrossRemote :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// EDIT CROSSES ARRAY
router.post("/editCrosses", (req, res) => {
  try {
    console.time("POST /editCrosses");
    const options = {
      method: "POST",
      url: `${API_URL}/round/crossed/edit`,
      headers: {
        "Content-Type": "application/json",
      },
      data: req.body,
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("getInfo", response.data);
        });
        console.timeEnd("POST /editCrosses");
      })
      .catch((error) => {
        console.log("1. Log error on POST /editCrosses :>> ", error);
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on POST /editCrosses :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET HISTORY
router.get("/gethistory", (req, res) => {
  try {
    console.time("GET /gethistory");
    const options = {
      method: "GET",
      url: `${API_URL}/history`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /gethistory");
      })
      .catch((error) => {
        console.log("1. Log error on GET /gethistory :>> ", error);
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /gethistory :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET CURRENT STATE
router.get("/getstate", (req, res) => {
  try {
    console.time("GET /getstate");
    const options = {
      method: "GET",
      url: `${API_URL}/state/current`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /getstate");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getstate :>> ", error);
        console.log("error while getting curring state", error.message);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getstate :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

router.get("/getLastRound", (req, res) => {
  try {
    console.time("GET /getLastRound");
    const options = {
      method: "GET",
      url: `${API_URL}/tournament/lastround`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("last_round", response.data);
        });
        console.timeEnd("GET /getLastRound");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getLastRound :>> ", error);
        if (error.response.data.status) {
          console.log("handled error", error.response.data);
          res.status(200).send(error.response.data);
        }
        console.log("error getting last round", error.response.data);

        res.status(500).send();
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getLastRound :>> ", error.response);
      console.log(error.response);
    }

    res.status(500).send();
  }
});

router.get("/getCoreTime", (req, res) => {
  try {
    console.time("GET /getCoreTime");
    const options = {
      method: "GET",
      url: `${API_URL}/time`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /getCoreTime");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getCoreTime :>> ", error);
        if (error.response) {
          console.log("error getting core timeStamp", error.response);
          // res.status(200).send(error.response);
        }

        res.status(500).send(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getCoreTime :>> ", error.response);
      console.log(error.response);
    }

    res.status(500).send();
  }
});

router.get("/getled", (req, res) => {
  try {
    console.time("GET /getled");
    const options = {
      method: "GET",
      url: `${API_URL}/led/status`,
      headers: {
        "Content-Type": "application/json",
      },
    };
    axios
      .request(options)
      .then((response) => {
        res.json(response.data);
        console.timeEnd("GET /getled");
      })
      .catch((error) => {
        console.log("1. Log error on GET /getled :>> ", error);
        if (error.response) {
          console.log("error trying to get LED status", error.response.data);
        }
        res.status(500).send(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on GET /getled :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

router.post("/switchLED", (req, res) => {
  console.log(req.body);
  try {
    console.time("POST /switchLED");
    const options = {
      method: "POST",
      url: `${API_URL}/led/switch`,
      headers: {
        "Content-Type": "application/json",
      },
      data: req.body,
    };
    axios
      .request(options)
      .then((response) => {
        console.log("1. Log error on POST /switchLED :>> ", error);
        res.json(response.data);
        console.timeEnd("POST /switchLED");
      })
      .catch((error) => {
        if (error.response) {
          console.log("error trying to switch LED", error.response.data);
        }
        res.status(500).send(error);
      });
  } catch (error) {
    if (error.response) {
      console.log("2. Log error.response on POST /switchLED :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

router.post("/longcross", (req, res) => {
  try {
    console.time("POST /longCross");
    SocketServer.getSockets().forEach((socket) => {
      socket.emit("longCross", { data: "data" });
    });
    console.timeEnd("POST /longCross");
  } catch (error) {
    if (error.response) {
      console.log("1. Log error.response on POST /longCross :>> ", error.response);
      console.log(error.response);
    }
    res.status(500).send();
  }
});

module.exports = router;
