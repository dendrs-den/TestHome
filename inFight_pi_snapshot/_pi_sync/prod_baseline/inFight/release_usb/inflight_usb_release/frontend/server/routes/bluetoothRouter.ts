import express from "express";
const router = express.Router();
const bluetoothController = require("../controllers/bluetoothController");

router.get("/", bluetoothController.getById);
router.post("/", bluetoothController.create);
router.post("/", bluetoothController.delete);
router.post("/", bluetoothController.update);

module.exports = router;
