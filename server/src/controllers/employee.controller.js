const TimeLog = require("../models/TimeLog");
const BreakLog = require("../models/BreakLog");
const Attendance = require("../models/Attendance");

/**
 * Get own timelogs
 * Optional query: ?date=YYYY-MM-DD
 */
exports.getMyTimeLogs = async (req, res) => {
  const userId = req.user.userId;
  const orgId = req.user.orgId;
  const { date } = req.query;

  const filter = { userId, orgId };
  if (date) filter.date = date;

  const logs = await TimeLog.find(filter);
  res.json(logs);
};

/**
 * Get own break logs
 * Optional query: ?date=YYYY-MM-DD
 */
exports.getMyBreakLogs = async (req, res) => {
  const userId = req.user.userId;
  const orgId = req.user.orgId;
  const { date } = req.query;

  const timeLogs = await TimeLog.find({ userId, orgId, ...(date ? { date } : {}) });

  // Get all break logs related to these timelogs
  const timeLogIds = timeLogs.map(t => t._id);
  const breaks = await BreakLog.find({ userId, orgId, timeLogId: { $in: timeLogIds } });

  res.json(breaks);
};

/**
 * Get own attendance
 * Optional query: ?date=YYYY-MM-DD
 */
exports.getMyAttendance = async (req, res) => {
  const userId = req.user.userId;
  const orgId = req.user.orgId;
  const { date } = req.query;

  const filter = { userId, orgId };
  if (date) filter.date = date;

  const attendance = await Attendance.find(filter);
  res.json(attendance);
};
