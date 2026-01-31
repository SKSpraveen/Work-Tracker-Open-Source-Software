const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Organization", 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  date: { 
    type: String, 
    required: true 
  }, 
  // SEPARATE: Present/Absent marking
  presentStatus: {
    type: String,
    enum: ["present", "absent", "late"],
    default: "absent"
  },
  markedPresent: {
    type: Boolean,
    default: false
  },
  
  // Work data
  workMinutes: { 
    type: Number, 
    default: 0 
  },
  breakMinutes: { 
    type: Number, 
    default: 0 
  },
  startTime: { 
    type: Date,
    default: null 
  },
  endTime: { 
    type: Date,
    default: null 
  },
  
  // SEPARATE: Leave information
  leaveType: { 
    type: String, 
    enum: ["half-day", "short-leave", null], 
    default: null 
  },
  leaveTimeSlot: {
    type: String,
    enum: [
      "morning-half", // 8:30-12:30
      "evening-half", // 1:30-5:30
      "morning-short", // 8:30-10:30
      "evening-short", // 3:30-5:30
      null
    ],
    default: null
  },
  leaveStatus: { 
    type: String, 
    enum: ["pending", "approved", "rejected", null], 
    default: null 
  },
  notes: { 
    type: String,
    default: "" 
  }
}, { timestamps: true });

AttendanceSchema.index({ userId: 1, orgId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ orgId: 1, date: 1 });

module.exports = mongoose.model("Attendance", AttendanceSchema);