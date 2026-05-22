import express from "express";
const router = express.Router();
const stagesController = require("../controllers/stagesController");

router.get("/getbyid/:id", stagesController.getById);
router.post("/add", stagesController.create);
router.post("/delete", stagesController.delete);
router.post("/update", stagesController.update);

module.exports = router;
