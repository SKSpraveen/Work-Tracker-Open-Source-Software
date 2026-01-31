const User = require("../models/User");
const TimeLog = require("../models/TimeLog");
const BreakLog = require("../models/BreakLog");
const Attendance = require("../models/Attendance");

/**
 * Get all employees
 */
exports.getAllEmployees = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const users = await User.find({ orgId, role: "employee" }).select("-password");
    res.json(users);
  } catch (err) {
    console.error("getAllEmployees error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all work logs (TimeLog) for a company
 */
exports.getAllTimeLogs = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { date } = req.query;

    const filter = { orgId };
    if (date) filter.date = date;

    const logs = await TimeLog.find(filter)
      .populate("userId", "name email")
      .lean();

    const today = new Date().toISOString().split("T")[0];

    for (let log of logs) {
      const breaks = await BreakLog.find({
        timeLogId: log._id,
        orgId
      }).lean();

      const activeBreak = breaks.find(b => !b.endTime);
      log.activeBreak = activeBreak || null;

      // -----------------------------
      // Break summary
      // -----------------------------
      log.breakSummary = {
        breakfast: breaks
          .filter(b => b.type === "breakfast")
          .reduce((s, b) => s + Number(b.minutes || 0), 0),

        lunch: breaks
          .filter(b => b.type === "lunch")
          .reduce((s, b) => s + Number(b.minutes || 0), 0),

        other: breaks
          .filter(b => b.type === "other")
          .reduce((s, b) => s + Number(b.minutes || 0), 0),
      };

      // Store total break minutes
      log.breakMinutes = log.breakSummary.breakfast + log.breakSummary.lunch + log.breakSummary.other;

      // -----------------------------
      //  ENHANCED STATUS LOGIC
      // -----------------------------
      
      const isPreviousDay = log.date < today;
      
      // AUTO-COMPLETE PREVIOUS DAYS (Real-time check)
      if (isPreviousDay) {
        // If previous day is not marked as completed, complete it now
        if (log.status !== 'completed') {
          const updateData = {
            status: 'completed',
            isPaused: false
          };
          
          // If startTime still exists, clear it
          if (log.startTime) {
            updateData.startTime = null;
          }
          
          // Set endTime if not set
          if (!log.endTime) {
            updateData.endTime = log.lastStopTime || new Date(log.date + 'T23:59:59');
          }
          
          // Update in database
          await TimeLog.findByIdAndUpdate(log._id, updateData);
          
          // Update the log object
          log.status = 'completed';
          log.endTime = updateData.endTime;
          log.startTime = null;
          log.isPaused = false;
        }
        
        log.currentStatus = "completed";
      } 
      // CURRENT DAY LOGIC
      else {
        // Priority 1: Active break
        if (activeBreak) {
          log.currentStatus = `${activeBreak.type}-break`;
        }
        // Priority 2: Currently working
        else if (log.startTime && !log.endTime) {
          log.currentStatus = "working";
        }
        // Priority 3: Stopped (paused)
        else if (log.isPaused && log.lastStopTime && !log.endTime) {
          log.currentStatus = "stopped";
        }
        // Priority 4: Completed for today
        else if (log.endTime || log.status === 'completed') {
          log.currentStatus = "completed";
        }
        // Priority 5: Not started yet
        else {
          log.currentStatus = null;
        }
      }

      // Add leave information to currentStatus if applicable
      if (log.leaveType && log.currentStatus !== "working" && log.currentStatus !== "stopped") {
        log.currentStatus = "completed"; // On leave means completed
      }
    }

    res.json(logs);
  } catch (err) {
    console.error("getAllTimeLogs error:", err);
    res.status(500).json({
      message: "Failed to fetch time logs",
      error: err.message
    });
  }
};

/**
 * Get all break logs
 */
exports.getAllBreakLogs = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { date } = req.query;

    const logs = await BreakLog.find({ orgId })
      .populate({
        path: "timeLogId",
        match: date ? { date } : {},
        select: "date"
      })
      .populate("userId", "name email");

    const filtered = logs.filter(l => l.timeLogId != null);
    res.json(filtered);
  } catch (err) {
    console.error("getAllBreakLogs error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get attendance reports
 */
exports.getAttendanceReport = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { date } = req.query;
    const filter = { orgId };
    if (date) filter.date = date;

    const report = await Attendance.find(filter)
      .populate("userId", "name email");

    res.json(report);
  } catch (err) {
    console.error("getAttendanceReport error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get individual employee logs by userId
 */
exports.getEmployeeLogs = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId, orgId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const timeLogs = await TimeLog.find({ orgId, userId }).sort({ date: -1 });
    const breakLogs = await BreakLog.find({ orgId, userId }).sort({ startTime: -1 });
    const attendance = await Attendance.find({ orgId, userId }).sort({ date: -1 });

    res.json({ user, timeLogs, breakLogs, attendance });
  } catch (err) {
    console.error("getEmployeeLogs error:", err);
    res.status(500).json({ message: err.message });
  }
};