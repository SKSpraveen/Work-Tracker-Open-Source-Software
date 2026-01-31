const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Organization",
  new mongoose.Schema({
    name: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    officeHours: { type: Number, default: 9 },
    lunchMinutes: { type: Number, default: 60 },
    breakfastMinutes: { type: Number, default: 20 },
    createdAt: { type: Date, default: Date.now }
  })
);
