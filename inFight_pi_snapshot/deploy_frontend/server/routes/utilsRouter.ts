import express from "express";
const router = express.Router();
const utilsController = require("../controllers/utilsController");

router.get("/", utilsController.getIp);

module.exports = router;
