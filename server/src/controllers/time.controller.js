const TimeLog = require("../models/TimeLog");
const BreakLog = require("../models/BreakLog");
const Attendance = require("../models/Attendance");
const { getLocalDateString } = require('../utils/dateUtils');

const getToday = () => getLocalDateString();


// ===============================
//  START WORK (MULTI-START)
// ===============================
exports.startWork = async (req, res) => {
  try {
    const { userId, orgId } = req.user;
    const date = getLocalDateString();

    let log = await TimeLog.findOne({ userId, orgId, date });

    if (!log) {
      log = await TimeLog.create({
        userId,
        orgId,
        date
      });
    }

    if (log.startTime) {
      return res.status(400).json({ message: "Work already running" });
    }

    // SET FIRST START ONLY ONCE
    if (!log.firstStartTime) {
      log.firstStartTime = new Date();
    }

    log.startTime = new Date();
    log.isPaused = false;
    log.status = 'working';

    await log.save();
    res.json(log);
  } catch (err) {
    console.error(" startWork error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
//  STOP WORK (PAUSE ONLY)
// ===============================
exports.stopWork = async (req, res) => {
  try {
    const { userId, orgId } = req.user;

    const log = await TimeLog.findOne({
      userId,
      orgId,
      startTime: { $ne: null }
    });

    if (!log) {
      return res.status(400).json({ message: "Work not running" });
    }

    const activeBreak = await BreakLog.findOne({
      userId,
      orgId,
      timeLogId: log._id,
      endTime: null
    });

    if (activeBreak) {
      return res.status(400).json({ message: "End break first" });
    }

    const now = new Date();
    const minutes = (now - new Date(log.startTime)) / 60000;

    log.workMinutes += minutes;
    log.startTime = null;
    log.lastStopTime = now;
    log.isPaused = true;
    log.status = 'stopped';

    await log.save();
    await updateAttendance(log);

    res.json(log);
  } catch (err) {
    console.error("stopWork error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
//  START BREAK
// ===============================
exports.startBreak = async (req, res) => {
  try {
    const { type } = req.body;
    const { userId, orgId } = req.user;

    const log = await TimeLog.findOne({
      userId,
      orgId,
      startTime: { $ne: null }
    });

    if (!log) {
      return res.status(400).json({ message: "Start work first" });
    }

    const now = new Date();
    const minutes = (now - new Date(log.startTime)) / 60000;

    // Pause work
    log.workMinutes += minutes;
    log.startTime = null;
    log.isPaused = true;
    log.status = `${type}-break`;
    await log.save();

    const breakLog = await BreakLog.create({
      userId,
      orgId,
      timeLogId: log._id,
      type,
      startTime: now
    });

    res.json({ breakLog, message: "Break started" });
  } catch (err) {
    console.error("startBreak error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
//  STOP BREAK (RESUME WORK)
// ===============================
exports.stopBreak = async (req, res) => {
  try {
    const { userId, orgId } = req.user;

    const breakLog = await BreakLog.findOne({
      userId,
      orgId,
      endTime: null
    });

    if (!breakLog) {
      return res.status(400).json({ message: "No active break" });
    }

    breakLog.endTime = new Date();
    breakLog.minutes = (breakLog.endTime - new Date(breakLog.startTime)) / 60000;

    await breakLog.save();

    const log = await TimeLog.findById(breakLog.timeLogId);

    log.breakMinutes += breakLog.minutes;
    log.startTime = new Date();
    log.isPaused = false;
    log.status = 'working';

    await log.save();

    res.json({ breakLog, message: "Break ended, work resumed" });
  } catch (err) {
    console.error("stopBreak error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
//  GET TODAY LOG
// ===============================
exports.getTodayLog = async (req, res) => {
  try {
    const { userId, orgId } = req.user;
    const date = getToday();

    const log = await TimeLog.findOne({ userId, orgId, date });
    if (!log) return res.json({});

    // Get ALL breaks for today
    const allBreaks = await BreakLog.find({
      userId,
      orgId,
      timeLogId: log._id
    });

    // Get active break
    const activeBreak = allBreaks.find(b => !b.endTime);

    // Calculate total break minutes by type
    const breakfastTotal = allBreaks
      .filter(b => b.type === 'breakfast')
      .reduce((sum, b) => sum + (b.minutes || 0), 0);
    
    const lunchTotal = allBreaks
      .filter(b => b.type === 'lunch')
      .reduce((sum, b) => sum + (b.minutes || 0), 0);
    
    const otherTotal = allBreaks
      .filter(b => b.type === 'other')
      .reduce((sum, b) => sum + (b.minutes || 0), 0);

    res.json({ 
      ...log.toObject(), 
      activeBreak,
      breakSummary: {  // Add this object
        breakfast: breakfastTotal,
        lunch: lunchTotal,
        other: otherTotal
      }
    });
  } catch (err) {
    console.error("getTodayLog error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
//  ATTENDANCE UPDATE
// ===============================
async function updateAttendance(log) {
  try {
    const hours = log.workMinutes / 60;

    let status = "absent";
    if (hours >= 9) status = "present";
    else if (hours >= 4.5) status = "half-day";

    await Attendance.findOneAndUpdate(
      { userId: log.userId, orgId: log.orgId, date: log.date },
      {
        status,
        workMinutes: log.workMinutes,
        breakMinutes: log.breakMinutes
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("updateAttendance error:", err);
  }
}