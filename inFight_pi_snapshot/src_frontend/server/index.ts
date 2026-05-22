import express, { Express, Request, Response } from "express";
const path = require("path");
const cors = require("cors");
const SocketServer = require("./models/SocketServer");
const Logger = require("./models/Logger");
const router = require("./routes/index");
const PORT = process.env.WEBSERVER_PORT || 3001;

require("dotenv").config();

const app: Express = express();

const logger = Logger.getInstance();

app.use(express.json());
app.use("/", router);
app.use(cors());
app.use(express.json());

const start = async () => {
  try {
    app.listen(PORT, () => {
      const message = `Server is listening at http://localhost:${PORT}`;
      console.log(message);
      logger.info(message);
    });
  } catch (e) {
    console.log(e);
    logger.error(e);
  }
};

start();
