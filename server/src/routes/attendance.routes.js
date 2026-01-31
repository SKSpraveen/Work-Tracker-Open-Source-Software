const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const controller = require("../controllers/attendance.controller");

// Employee: compute own attendance
router.get("/today", auth, role("owner","admin","employee"), controller.computeAttendance);

// Admin: view all employees' attendance
router.get("/all-today", auth, role("owner","admin"), controller.getAllTodayAttendance);

// Employee: mark attendance as present
router.post("/mark-present", auth, role("owner","admin","employee"), controller.markPresent);

// Employee: request leave (half-day or short-leave)
router.post("/request-leave", auth, role("owner","admin","employee"), controller.requestLeave);

// Admin approve/reject leave
router.post("/leave/:id/approve", auth, role("owner","admin"), controller.approveLeave);
router.post("/leave/:id/reject", auth, role("owner","admin"), controller.rejectLeave);

module.exports = router;