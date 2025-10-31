const mongoose = require("mongoose");

const selfAttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  photoUrl: { type: String, required: true },
  time: { type: String, required: true },
  latitude: { type: String },
  longitude: { type: String },
  address: { type: String },
});

module.exports = mongoose.model("SelfAttendance", selfAttendanceSchema);
