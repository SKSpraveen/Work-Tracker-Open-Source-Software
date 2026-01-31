const mongoose = require("mongoose");

const BreakLogSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  timeLogId: { type: mongoose.Schema.Types.ObjectId, ref: "TimeLog", required: true },
  type: { type: String, enum: ["breakfast", "lunch", "other"], required: true },
  startTime: Date,
  endTime: Date,
  minutes: { type: Number, default: 0 }
});

module.exports = mongoose.model("BreakLog", BreakLogSchema);
