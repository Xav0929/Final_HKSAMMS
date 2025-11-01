// models/selfAttendance.js
const mongoose = require("mongoose");

const selfAttendanceSchema = new mongoose.Schema({
  scholarId: { type: String, required: true }, // This is the student ID
  photoUrl: { type: String, required: true },
  time: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  address: { type: String },
}, { timestamps: true });

// Index for fast lookup
selfAttendanceSchema.index({ scholarId: 1 });

module.exports = mongoose.model("SelfAttendance", selfAttendanceSchema);