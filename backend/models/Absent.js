const mongoose = require("mongoose");

const absentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  date: { type: Date, required: true },
  room: { type: String, required: true },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'absents'  // ← FORCE NAME
});

absentSchema.index({ studentId: 1, date: 1, room: 1, time: 1 }, { unique: true });

module.exports = mongoose.model("Absent", absentSchema);