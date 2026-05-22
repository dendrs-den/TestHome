const express = require("express");
const router = express.Router();
const axios = require("axios").default;
const SocketServer = require("../models/SocketServer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const API_URL = "http://127.0.0.1:15010";
const CORE_API_URL = process.env.CORE_API_URL || "";
const SERVICE_MODE_ENABLED =
  process.env.SERVICE_MODE === "1" ||
  CORE_API_URL.includes("127.0.0.1:15010") ||
  CORE_API_URL.includes("localhost:15010");

// In local service mode we keep round telemetry in-memory so UI can work
// without hardware/core events.
let serviceRoundStartTs = null;
let serviceCrosses = [];
let serviceFaults = [];
let serviceLastFactTime = 0;
let servicePrepared = false;

const isServiceRoundActive = () => serviceRoundStartTs !== null;
const isServiceModeEnabled = () => SERVICE_MODE_ENABLED;
const isServiceFlowActive = () => isServiceModeEnabled() && isServiceRoundActive();
const SAVE_ERROR_STATUS = "Round data was not saved due to system error";
const FINALIZATION_IN_PROGRESS_STATUS = "Round finalization is already in progress";

const serviceStopGuard = {
  inProgress: false,
  lastCompletedAt: 0,
  lastResponse: null,
};

const SERVICE_STOP_DEDUP_WINDOW_MS = 5000;
const getServiceElapsedMs = () => {
  if (!isServiceRoundActive()) return 0;
  return Math.max(0, Date.now() - serviceRoundStartTs);
};

// SEND BUST (WEB)
router.post("/sendbust", async (req, res) => {
  if (isServiceFlowActive()) {
    const newFault = {
      device_id: 0,
      device_type: "terminal",
      type: "bust",
      time: getServiceElapsedMs(),
      valid: true,
    };
    serviceFaults.push(newFault);
    try {
      await axios.request({
        method: "POST",
        url: `${API_URL}/round/fault/edit`,
        headers: { "Content-Type": "application/json" },
        data: serviceFaults,
      });
    } catch (e) {}
    SocketServer.getSockets().forEach((socket) => {
      socket.emit("bust", newFault);
      socket.emit("getInfo", null);
    });
    return res.json({ valid: true, service: true, fault: newFault });
  }

  try {
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
      })
      .catch((error) => {
        console.log("fault error 1 : ", error);
        res.status(500).send();
      });
  } catch (error) {
    if (error.response) {
      console.log("fault error 2 :", error.response.data);
    }
    res.status(500).send();
  }
});

// SEND SKIP (WEB)
router.post("/sendskip", async (req, res) => {
  if (isServiceFlowActive()) {
    const newFault = {
      device_id: 0,
      device_type: "terminal",
      type: "skip",
      time: getServiceElapsedMs(),
      valid: true,
    };
    serviceFaults.push(newFault);
    try {
      await axios.request({
        method: "POST",
        url: `${API_URL}/round/fault/edit`,
        headers: { "Content-Type": "application/json" },
        data: serviceFaults,
      });
    } catch (e) {}
    SocketServer.getSockets().forEach((socket) => {
      socket.emit("skip", newFault);
      socket.emit("getInfo", null);
    });
    return res.json({ valid: true, service: true, fault: newFault });
  }

  try {
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
      })
      .catch((error) => {
        console.log("skip error 1 : ", error);
        res.status(500).send();
      });
  } catch (error) {
    if (error.response) {
      console.log("skip error 2 :", error.response);
    }
    res.status(500).send();
  }
});

// SET STATE PREPARE
router.post("/setPrepare", (req, res) => {
  try {
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
      })
      .catch((error) => {
        console.log(error);
      })
      .then(() => {
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("statePrepare", "");
          socket.emit("nextRound");
        });
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// SET ADMINISTRATION STATE
router.post("/setAdministration", (req, res) => {
  try {
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
      })
      .catch((error) => {
        console.log(error);
      })
      .then(() => {
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("stateAdministration", {});
        });
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(400);
  }
});

// SET ROUND INFO

// GET INFO
router.get("/getinfo", (req, res) => {
  try {
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
        const coreInfo = response.data || {};
        const shouldMergeService =
          (isServiceModeEnabled() && servicePrepared) ||
          (isServiceModeEnabled() && isServiceRoundActive()) ||
          serviceLastFactTime > 0 ||
          serviceFaults.length > 0 ||
          serviceCrosses.length > 0;

        const mergedInfo = shouldMergeService
          ? servicePrepared
            ? {
                ...coreInfo,
                faults: [],
                crossed: [],
                round: {
                  ...(coreInfo.round || {}),
                  faults: [],
                  crossings: [],
                  time_real: 0,
                  time_result: 0,
                },
              }
            : {
                ...coreInfo,
                faults: serviceFaults.length > 0 ? serviceFaults : coreInfo.faults || [],
                crossed:
                  serviceCrosses.length > 0 ? serviceCrosses : coreInfo.crossed || [],
                round: {
                  ...(coreInfo.round || {}),
                  faults:
                    serviceFaults.length > 0
                      ? serviceFaults
                      : coreInfo?.round?.faults || coreInfo.faults || [],
                  crossings:
                    serviceCrosses.length > 0
                      ? serviceCrosses
                      : coreInfo?.round?.crossings || coreInfo.crossed || [],
                  time_real:
                    Number(coreInfo?.round?.time_real) > 0
                      ? coreInfo.round.time_real
                      : serviceLastFactTime,
                  time_result:
                    Number(coreInfo?.round?.time_result) > 0
                      ? coreInfo.round.time_result
                      : serviceLastFactTime,
                },
              }
          : coreInfo;

        res.json(mergedInfo);
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("relevantData", mergedInfo);
        });
      })
      .catch((error) => {
        console.log("an error while getting info :", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});
// GET INFO
router.get("/getCurrentRound", (req, res) => {
  if (
    isServiceModeEnabled() &&
    (serviceLastFactTime > 0 || serviceCrosses.length > 0 || serviceFaults.length > 0) &&
    !isServiceRoundActive()
  ) {
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
          const coreRound = response.data || {};
          const mergedRound = {
            ...coreRound,
            time_real:
              Number(coreRound?.time_real) > 0
                ? coreRound.time_real
                : serviceLastFactTime,
          };
          res.json(mergedRound);
        })
        .catch(() => {
          res.json({
            time_real: serviceLastFactTime,
          });
        });
      return;
    } catch (error) {
      return res.json({
        time_real: serviceLastFactTime,
      });
    }
  }

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
      })
      .catch((error) => {
        console.log("an error while getting current round :", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// SAVE ROUND
router.get("/saveround", (req, res) => {
  try {
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
      })
      .catch((error) => {
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET ROUND RESULTS (GET ALL FAULTS)
router.get("/getallfaults", (req, res) => {
  if (isServiceModeEnabled() && (isServiceRoundActive() || serviceFaults.length > 0)) {
    return res.json(serviceFaults);
  }

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
      })
      .catch((error) => {
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// EDIT FAULT (both for editing and deleting)
router.post("/editfaults", (req, res) => {
  if (isServiceModeEnabled() && (isServiceRoundActive() || serviceFaults.length > 0)) {
    serviceFaults = Array.isArray(req.body) ? req.body : serviceFaults;
    axios
      .request({
        method: "POST",
        url: `${API_URL}/round/fault/edit`,
        headers: { "Content-Type": "application/json" },
        data: serviceFaults,
      })
      .then(() => {
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("getInfo", null);
        });
        res.json({ valid: true, service: true, data: serviceFaults });
      })
      .catch(() => {
        res.status(500).json({ valid: false, service: true });
      });
    return;
  }

  try {
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
      })
      .catch((error) => {
        console.log("error during editing fault:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET ALL CROSSES
router.get("/getallCrosses", (req, res) => {
  if (isServiceModeEnabled() && (isServiceRoundActive() || serviceCrosses.length > 0)) {
    return res.json(serviceCrosses);
  }

  try {
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
      })
      .catch((error) => {
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET NEXT CROSS
router.get("/getCrossRemote", (req, res) => {
  try {
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
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// EDIT CROSSES ARRAY
router.post("/editCrosses", (req, res) => {
  if (isServiceModeEnabled() && (isServiceRoundActive() || serviceCrosses.length > 0)) {
    serviceCrosses = Array.isArray(req.body) ? req.body : serviceCrosses;
    axios
      .request({
        method: "POST",
        url: `${API_URL}/round/crossed/edit`,
        headers: { "Content-Type": "application/json" },
        data: serviceCrosses,
      })
      .then(() => {
        SocketServer.getSockets().forEach((socket) => {
          socket.emit("getInfo", null);
        });
        res.json({ valid: true, service: true, data: serviceCrosses });
      })
      .catch(() => {
        res.status(500).json({ valid: false, service: true });
      });
    return;
  }

  try {
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
      })
      .catch((error) => {
        console.log("AN ERROR OCCURED:", error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// GET HISTORY
router.get("/gethistory", (req, res) => {
  try {
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
      })
      .catch((error) => {
        console.log("AN ERROR OCCURED:", error);
        res.status(500).json([]);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).json([]);
  }
});

// GET CURRENT STATE
router.get("/getstate", (req, res) => {
  try {
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
      })
      .catch((error) => {
        console.log("error while getting curring state", error.message);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

router.get("/getLastRound", (req, res) => {
  try {
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
      })
      .catch((error) => {
        if (error.response.data.status) {
          console.log("handled error", error.response.data);
          res.status(200).send(error.response.data);
        }
        console.log("error getting last round", error.response.data);

        res.status(500).send();
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }

    res.status(500).send();
  }
});

router.get("/getCoreTime", (req, res) => {
  try {
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
      })
      .catch((error) => {
        if (error.response) {
          console.log("error getting core timeStamp", error.response);
          // res.status(200).send(error.response);
        }

        res.status(500).send(error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }

    res.status(500).send();
  }
});

router.get("/getled", (req, res) => {
  try {
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
      })
      .catch((error) => {
        if (error.response) {
          console.log("error trying to get LED status", error.response.data);
        }
        res.status(500).send(error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

router.post("/switchLED", (req, res) => {
  console.log(req.body);
  try {
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
        res.json(response.data);
      })
      .catch((error) => {
        if (error.response) {
          console.log("error trying to switch LED", error.response.data);
        }
        res.status(500).send(error);
      });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

router.post("/longcross", (req, res) => {
  try {
    SocketServer.getSockets().forEach((socket) => {
      socket.emit("longCross", { data: "data" });
    });
  } catch (error) {
    if (error.response) {
      console.log(error.response);
    }
    res.status(500).send();
  }
});

// SERVICE MODE: start round flow without hardware/core
router.post("/service/activate", async (req, res) => {
  if (!isServiceModeEnabled()) {
    return res.status(404).json({ error: "Service mode is disabled" });
  }
  try {
    // In service mode the timer must start on first crossing, not on Activate.
    serviceRoundStartTs = null;
    serviceLastFactTime = 0;
    serviceCrosses = [];
    serviceFaults = [];
    servicePrepared = true;
    serviceStopGuard.inProgress = false;
    serviceStopGuard.lastCompletedAt = 0;
    serviceStopGuard.lastResponse = null;
    try {
      await axios.request({
        method: "POST",
        url: `${API_URL}/round/start`,
        headers: { "Content-Type": "application/json" },
      });
      await axios.request({
        method: "POST",
        url: `${API_URL}/round/crossed/edit`,
        headers: { "Content-Type": "application/json" },
        data: [],
      });
      await axios.request({
        method: "POST",
        url: `${API_URL}/round/fault/edit`,
        headers: { "Content-Type": "application/json" },
        data: [],
      });
    } catch (e) {}

    SocketServer.getSockets().forEach((socket) => {
      socket.emit("stateStart", "");
      socket.emit("getInfo", null);
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).send();
  }
});

// SERVICE MODE: emulate additional crossing signal
router.post("/service/cross", async (req, res) => {
  if (!isServiceModeEnabled()) {
    return res.status(404).json({ error: "Service mode is disabled" });
  }
  try {
    const isFirstCross = !isServiceRoundActive();
    if (isFirstCross) {
      serviceRoundStartTs = Date.now();
      serviceCrosses = [];
      serviceFaults = [];
      servicePrepared = false;
    }
    const newCross = { cross: getServiceElapsedMs() };
    serviceCrosses.push(newCross);
    try {
      await axios.request({
        method: "POST",
        url: `${API_URL}/round/crossed/edit`,
        headers: { "Content-Type": "application/json" },
        data: serviceCrosses,
      });
    } catch (e) {}
    if (isFirstCross) {
      SocketServer.getSockets().forEach((socket) => {
        socket.emit("stopWatch_start", "");
      });
    }
    res.json({ ok: true, cross: newCross });
  } catch (error) {
    res.status(500).send();
  }
});

// SERVICE MODE: stop round flow without hardware/core
router.post("/service/stop", async (req, res) => {
  if (!isServiceModeEnabled()) {
    return res.status(404).json({ error: "Service mode is disabled" });
  }
  try {
    if (
      Date.now() - serviceStopGuard.lastCompletedAt <= SERVICE_STOP_DEDUP_WINDOW_MS &&
      serviceStopGuard.lastResponse
    ) {
      return res.json(serviceStopGuard.lastResponse);
    }
    if (serviceStopGuard.inProgress) {
      return res.status(409).send({ text: { status: FINALIZATION_IN_PROGRESS_STATUS } });
    }
    serviceStopGuard.inProgress = true;

    const factTime = getServiceElapsedMs();
    const fakeResult = {
      result: true,
      fact_time: factTime,
      result_time: factTime,
    };
    await axios.request({
      method: "POST",
      url: `${API_URL}/round/fault/edit`,
      headers: { "Content-Type": "application/json" },
      data: serviceFaults,
    });
    await axios.request({
      method: "POST",
      url: `${API_URL}/round/crossed/edit`,
      headers: { "Content-Type": "application/json" },
      data: serviceCrosses,
    });
    await axios.request({
      method: "POST",
      url: `${API_URL}/round/end`,
      headers: { "Content-Type": "application/json" },
    });
    await axios.request({
      method: "GET",
      url: `${API_URL}/round/save`,
      headers: { "Content-Type": "application/json" },
    });

    serviceLastFactTime = factTime;
    serviceRoundStartTs = null;
    servicePrepared = false;
    SocketServer.getSockets().forEach((socket) => {
      socket.emit("stateStop", { result: fakeResult });
    });
    serviceStopGuard.lastCompletedAt = Date.now();
    serviceStopGuard.lastResponse = fakeResult;
    res.json(fakeResult);
  } catch (error) {
    console.log("service stop/save failed:", error?.response?.data || error);
    res.status(500).send({ text: { status: SAVE_ERROR_STATUS } });
  } finally {
    serviceStopGuard.inProgress = false;
  }
});

module.exports = router;
