const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const controller = require("../controllers/admin.controller");

// Only owner/admin can access
router.get("/employees", auth, role("owner","admin"), controller.getAllEmployees);
router.get("/timelogs", auth, role("owner","admin"), controller.getAllTimeLogs);
router.get("/breaklogs", auth, role("owner","admin"), controller.getAllBreakLogs);
router.get("/attendance", auth, role("owner","admin"), controller.getAttendanceReport);
router.get("/employee/:userId", auth, role("owner","admin"), controller.getEmployeeLogs);

module.exports = router;
