import express from "express";
const router = express.Router();
const actionsController = require("../controllers/actionsController");

router.get("/", actionsController.getById);
router.post("/", actionsController.create);
router.post("/", actionsController.delete);
router.post("/", actionsController.update);

module.exports = router;
