const express = require("express");
const cors = require("cors");
const path = require("path");
const SocketServer = require("./models/SocketServer");
const url = process.env.WEBSERVER_URL || "http://localhost";
const port = process.env.WEBSERVER_PORT || 3001;
const Logger = require("./models/Logger");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const app = express();

// Initiating websocket connection when the server stars
new SocketServer(app);

// This is for sending real request relatable to InFlight project functionality
const tournamentRoutes = require("./routes/tournaments");
const teamRoutes = require("./routes/teams");
const disciplinesRoutes = require("./routes/disciplines");
const roundRoutes = require("./routes/rounds.js");
const stageRoutes = require("./routes/stages");
const actionRoutes = require("./routes/actions");
const bluetoothRoutes = require("./routes/bluetooth");
const longpollRoutes = require("./routes/longpoll");

const logger = Logger.getInstance();

app.use(express.static(path.join(__dirname, "../client/build")));
app.use(cors());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.json());

// API routes
app.use("/tournaments", tournamentRoutes);
app.use("/teams", teamRoutes);
app.use("/disciplines", disciplinesRoutes);
app.use("/rounds", roundRoutes);
app.use("/stages", stageRoutes);
app.use("/actions", actionRoutes);
app.use("/bluetooth", bluetoothRoutes);
app.use("/lp", longpollRoutes);

// Serving the build version of client page
app.get("/terminal", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
app.get("/terminal/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
app.get("/infoboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
app.get("/infoboard/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
app.get("/scoreboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
app.get("/scoreboard/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

app.listen(port, (error) => {
  console.log(`webserver address: http://localhost:${port}`);
  console.log("core api address: ", process.env.CORE_API_URL);
  // error ? logger.error(error) : logger.info(`Listening at ${url}:${port}`);
});
