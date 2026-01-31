const TimeLog = require("../models/TimeLog");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { getLocalDateString } = require('../utils/dateUtils');

/**
 * Compute today's attendance for current user
 * Route: GET /api/attendance/today
 */
exports.computeAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orgId = req.user.orgId;
    const date = getLocalDateString(); // FIXED: Use local date

    // Get today's attendance record
    const attendance = await Attendance.findOne({ userId, orgId, date });

    // Get today's time log
    const timeLog = await TimeLog.findOne({ userId, orgId, date });

    // If there's an approved leave, return it
    if (attendance && attendance.leaveType && attendance.leaveStatus === "approved") {
      return res.json({
        date,
        presentStatus: attendance.presentStatus,
        markedPresent: attendance.markedPresent,
        workMinutes: 0,
        breakMinutes: 0,
        message: `${attendance.leaveType} approved`,
        leaveType: attendance.leaveType,
        leaveTimeSlot: attendance.leaveTimeSlot,
        leaveStatus: attendance.leaveStatus,
        isApproved: true
      });
    }

    // If there's a pending leave request
    if (attendance && attendance.leaveType && attendance.leaveStatus === "pending") {
      return res.json({
        date,
        presentStatus: attendance.presentStatus,
        markedPresent: attendance.markedPresent,
        workMinutes: 0,
        breakMinutes: 0,
        message: `${attendance.leaveType} pending approval`,
        leaveType: attendance.leaveType,
        leaveTimeSlot: attendance.leaveTimeSlot,
        leaveStatus: attendance.leaveStatus,
        isPending: true
      });
    }

    // If employee marked present
    if (attendance && attendance.markedPresent) {
      return res.json({
        date,
        markedPresent: true,
        presentStatus: "present",
        message: "Marked as present"
      });
    }

    // Calculate from timelog
    if (!timeLog || !timeLog.firstStartTime) {
      return res.json({
        date,
        presentStatus: "absent",
        workMinutes: 0,
        breakMinutes: 0,
        message: "No work log for today"
      });
    }

    // Calculate work time (excluding breaks)
    let workMinutes = timeLog.workMinutes || 0;

    // Determine status based on work hours
    const workHours = workMinutes / 60;
    const startHour = new Date(timeLog.firstStartTime).getHours();
    const startMinute = new Date(timeLog.firstStartTime).getMinutes();
    
    let presentStatus = "absent";
    const isLate = startHour > 9 || (startHour === 9 && startMinute > 15);
    
    if (workHours >= 9) {
      presentStatus = isLate ? "late" : "present";
    } else if (workHours >= 4.5) {
      presentStatus = "present"; // Still present, just less hours
    } else {
      presentStatus = "absent";
    }

    res.json({
      date,
      presentStatus,
      workMinutes: Math.round(workMinutes),
      breakMinutes: Math.round(timeLog.breakMinutes || 0),
      startTime: timeLog.firstStartTime,
      endTime: timeLog.endTime,
      isComplete: !!timeLog.endTime
    });
  } catch (err) {
    console.error("Compute attendance error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Employee marks attendance as present manually
 * Route: POST /api/attendance/mark-present
 */
exports.markPresent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orgId = req.user.orgId;
    const today = getLocalDateString(); // FIXED: Use local date

    let attendance = await Attendance.findOne({ userId, orgId, date: today });

    if (!attendance) {
      attendance = new Attendance({
        userId,
        orgId,
        date: today,
        markedPresent: true
      });
    } else {
      attendance.markedPresent = true;
    }

    await attendance.save();
    res.json({ message: "Attendance marked as present", attendance });
  } catch (err) {
    console.error("Mark present error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Employee requests leave
 * Route: POST /api/attendance/request-leave
 */
exports.requestLeave = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orgId = req.user.orgId;
    const { leaveType, leaveTimeSlot, notes } = req.body;

    const today = getLocalDateString(); // FIXED: Use local date

    // Validate leave type
    if (!leaveType || !["half-day", "short-leave"].includes(leaveType)) {
      return res.status(400).json({ message: "Invalid leave type. Must be 'half-day' or 'short-leave'" });
    }

    // Validate time slot
    const validSlots = ["morning-half", "evening-half", "morning-short", "evening-short"];
    if (!leaveTimeSlot || !validSlots.includes(leaveTimeSlot)) {
      return res.status(400).json({ message: "Invalid time slot" });
    }

    // Validate combination
    if (leaveType === "half-day" && !["morning-half", "evening-half"].includes(leaveTimeSlot)) {
      return res.status(400).json({ message: "Invalid time slot for half-day leave" });
    }
    if (leaveType === "short-leave" && !["morning-short", "evening-short"].includes(leaveTimeSlot)) {
      return res.status(400).json({ message: "Invalid time slot for short leave" });
    }

    let attendance = await Attendance.findOne({ userId, orgId, date: today });

    if (!attendance) {
      attendance = new Attendance({
        userId,
        orgId,
        date: today,
        notes: notes || "",
        leaveType,
        leaveTimeSlot,
        leaveStatus: "pending",
        workMinutes: 0,
        breakMinutes: 0
      });
    } else {
      attendance.notes = notes || attendance.notes || "";
      attendance.leaveType = leaveType;
      attendance.leaveTimeSlot = leaveTimeSlot;
      attendance.leaveStatus = "pending";
    }

    await attendance.save();

    const timeSlotText = {
      "morning-half": "8:30 AM - 12:30 PM",
      "evening-half": "1:30 PM - 5:30 PM",
      "morning-short": "8:30 AM - 10:30 AM",
      "evening-short": "3:30 PM - 5:30 PM"
    };

    res.json({ 
      message: `${leaveType} leave (${timeSlotText[leaveTimeSlot]}) requested and pending approval`, 
      attendance 
    });
  } catch (err) {
    console.error("Request leave error:", err);
    console.error("Error details:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ message: err.message || "Failed to request leave" });
  }
};

/**
 * Admin: Get all employees' attendance for today
 * Route: GET /api/attendance/all-today
 */
exports.getAllTodayAttendance = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const date = getLocalDateString(); // FIXED: Use local date

    // Get all employees
    const employees = await User.find({ orgId, role: "employee" }).select("_id name email");

    // Get attendance records for today
    const attendanceRecords = await Attendance.find({ orgId, date });

    // Get time logs for today
    const timeLogs = await TimeLog.find({ orgId, date });

    // Create attendance data for each employee
    const attendanceData = employees.map(emp => {
      const attendanceRecord = attendanceRecords.find(a => a.userId.toString() === emp._id.toString());
      const log = timeLogs.find(l => l.userId.toString() === emp._id.toString());

      // If employee has pending/approved leave
      if (attendanceRecord && attendanceRecord.leaveType && attendanceRecord.leaveStatus) {
        return {
          _id: attendanceRecord._id,
          userId: emp,
          date,
          presentStatus: attendanceRecord.presentStatus || "absent",
          markedPresent: attendanceRecord.markedPresent || false,
          workMinutes: 0,
          breakMinutes: 0,
          leaveType: attendanceRecord.leaveType,
          leaveTimeSlot: attendanceRecord.leaveTimeSlot,
          leaveStatus: attendanceRecord.leaveStatus,
          notes: attendanceRecord.notes
        };
      }

      // If employee manually marked present
      if (attendanceRecord && attendanceRecord.markedPresent) {
        return {
          _id: attendanceRecord._id,
          userId: emp,
          date,
          presentStatus: "present",
          workMinutes: 0,
          breakMinutes: 0,
          markedPresent: true
        };
      }

      // Calculate from timelog
      if (!log) {
        return {
          userId: emp,
          date,
          presentStatus: "absent",
          workMinutes: 0,
          breakMinutes: 0
        };
      }

      // Work minutes are already calculated (excluding breaks)
      const workMinutes = log.workMinutes || 0;

      // Determine status
      const workHours = workMinutes / 60;
      const startHour = log.firstStartTime ? new Date(log.firstStartTime).getHours() : 0;
      const startMinute = log.firstStartTime ? new Date(log.firstStartTime).getMinutes() : 0;
      const isLate = startHour > 9 || (startHour === 9 && startMinute > 15);

      let presentStatus = "absent";
      if (workHours >= 9) {
        presentStatus = isLate ? "late" : "present";
      } else if (workHours >= 4.5) {
        presentStatus = "present";
      }

      return {
        userId: emp,
        date,
        presentStatus,
        workMinutes: Math.round(workMinutes),
        breakMinutes: Math.round(log.breakMinutes || 0),
        startTime: log.firstStartTime,
        endTime: log.endTime
      };
    });

    res.json(attendanceData);
  } catch (err) {
    console.error("Get all attendance error:", err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/attendance/leave/:id/approve
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findById(id);
    
    if (!attendance || !attendance.leaveType) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    attendance.leaveStatus = "approved";
    await attendance.save();

    // Update or create TimeLog with leave type
    const timeLog = await TimeLog.findOne({ 
      userId: attendance.userId, 
      orgId: attendance.orgId,
      date: attendance.date 
    });

    if (timeLog) {
      timeLog.leaveType = attendance.leaveType;
      timeLog.leaveTimeSlot = attendance.leaveTimeSlot;
      // DON'T change status - it will auto-complete at midnight
      await timeLog.save();
    } else {
      // Create a timelog entry for the leave
      await TimeLog.create({
        userId: attendance.userId,
        orgId: attendance.orgId,
        date: attendance.date,
        leaveType: attendance.leaveType,
        leaveTimeSlot: attendance.leaveTimeSlot,
        workMinutes: 0,
        breakMinutes: 0,
        status: null // Don't set status, let midnight cron handle it
      });
    }

    res.json({ message: "Leave approved successfully", attendance });
  } catch (err) {
    console.error("Approve leave error:", err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/attendance/leave/:id/reject
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findById(id);
    
    if (!attendance || !attendance.leaveType) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    attendance.leaveStatus = "rejected";
    attendance.leaveType = null;
    attendance.leaveTimeSlot = null;
    await attendance.save();

    res.json({ message: "Leave rejected", attendance });
  } catch (err) {
    console.error("Reject leave error:", err);
    res.status(500).json({ message: err.message });
  }
};