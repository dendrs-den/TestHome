const Router = require("express");
const router = new Router();
// const bluetoothRouter = require("./bluetooth");
// const longpollRouter = require("./longpoll");
// const roundsRouter = require("./rounds");
const stagesRouter = require("./stages");
const teamsRouter = require("./teamsRouter");
const disciplinesRouter = require("./disciplinesRouter");
const tournamentsRouter = require("./tournamentsRouter");
const actionsRouter = require("./actionsRouter");
const utilsRouter = require("./utilsRouter");


router.use("/tournaments", tournamentsRouter);
router.use("/teams", teamsRouter);
router.use("/disciplines", disciplinesRouter);
router.use("/stages", teamsRouter);
router.use("/actions", actionsRouter);
router.use('/utils', utilsRouter)

module.exports = router;
