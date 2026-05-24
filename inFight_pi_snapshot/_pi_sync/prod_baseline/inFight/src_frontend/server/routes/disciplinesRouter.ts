import express from "express";
const router = express.Router();
const disciplinesController = require("../controllers/disciplinesController");

router.get("/getbyid/:id", disciplinesController.getById);
router.post("/add", disciplinesController.create);
router.post("/delete", disciplinesController.delete);
router.post("/update", disciplinesController.update);

module.exports = router;
