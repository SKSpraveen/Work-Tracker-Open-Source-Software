const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const controller = require("../controllers/time.controller");

// All routes require authentication
router.post("/start", auth, role("owner","admin","employee"), controller.startWork);
router.post("/stop", auth, role("owner","admin","employee"), controller.stopWork);
router.post("/break/start", auth, role("owner","admin","employee"), controller.startBreak);
router.post("/break/stop", auth, role("owner","admin","employee"), controller.stopBreak);
router.get("/today", auth, role("owner","admin","employee"), controller.getTodayLog);

module.exports = router;
