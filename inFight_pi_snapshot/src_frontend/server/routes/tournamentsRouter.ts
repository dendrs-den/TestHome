import express from "express";
const router = express.Router();
const tournamentsController = require("../controllers/tournamentController.ts");

router.get("/getall", tournamentsController.getAll);
router.get("/getcurrent", tournamentsController.getCurrent);
router.get("/current", tournamentsController.setCurrent);
router.get("/add", tournamentsController.create);
router.get("/delete", tournamentsController.delete);
router.get("/update", tournamentsController.update);
router.get("/current/update", tournamentsController.updateCurrent);
router.get("/training", tournamentsController.training);

module.exports = router;
