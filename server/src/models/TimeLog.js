const mongoose = require("mongoose");

const TimeLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    date: {
      type: String, 
      required: true
    },

    // FIRST START OF DAY (NEVER RESET)
    firstStartTime: {
      type: Date,
      default: null
    },

    // CURRENT RUNNING SESSION
    startTime: {
      type: Date,
      default: null
    },

    // LAST STOP TIME
    lastStopTime: {
      type: Date,
      default: null
    },

    // END OF DAY (OPTIONAL)
    endTime: {
      type: Date,
      default: null
    },

    // TOTAL WORK
    workMinutes: {
      type: Number,
      default: 0
    },

    breakMinutes: {
      type: Number,
      default: 0
    },

    isPaused: {
      type: Boolean,
      default: false
    },

    // NEW: Leave tracking
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

   status: {
      type: String,
      enum: [
        "working", 
        "stopped", 
        "completed", 
        "breakfast-break",  
        "lunch-break",      
        "other-break",      
        null
      ],
      default: null
    }
  },
  { timestamps: true }
);

TimeLogSchema.index({ userId: 1, orgId: 1, date: 1 });

module.exports = mongoose.model("TimeLog", TimeLogSchema);