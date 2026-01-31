const mongoose = require("mongoose");

module.exports = mongoose.model(
  "User",
  new mongoose.Schema({
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["owner", "admin", "employee"],
      default: "employee"
    }
  })
);
