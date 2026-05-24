import express from "express";
const router = express.Router();
const roundsController = require("../controllers/roundsController");

router.get("/", roundsController.getById);
router.post("/", roundsController.create);
router.post("/", roundsController.delete);
router.post("/", roundsController.update);
router.get('/',roundsController.getIp);

module.exports = router;
