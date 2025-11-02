const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: String, required: true },
  yearLevel: { type: String, required: true },
  course: { type: String, required: true },
  dutyType: { type: String, required: true },
  room: { type: String, required: true },
  classStatus: { type: String },
  facilitatorStatus: { type: String },
  encodedTime: { type: String, required: true },
  checkerId: { type: String },
  checkerName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Attendance', attendanceSchema);