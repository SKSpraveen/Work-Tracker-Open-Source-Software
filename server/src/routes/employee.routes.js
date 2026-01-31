const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const controller = require("../controllers/employee.controller");

// Employee routes
router.get("/timelogs", auth, role("employee","admin","owner"), controller.getMyTimeLogs);
router.get("/breaklogs", auth, role("employee","admin","owner"), controller.getMyBreakLogs);
router.get("/attendance", auth, role("employee","admin","owner"), controller.getMyAttendance);

module.exports = router;
