import express from "express";
const router = express.Router();
const teamsController = require("../controllers/teamController");

router.get("/getbyid/:id", teamsController.getById);
router.post("/add", teamsController.create);
router.post("/delete", teamsController.delete);
router.post("/update", teamsController.update);

module.exports = router;
