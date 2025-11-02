const mongoose = require('mongoose');

const faciAttendanceSchema = new mongoose.Schema({
  studentId:   { type: String, required: true },
  studentName: { type: String, required: true },
  checkInTime: { type: Date,   required: true, default: Date.now },
  
  // ✅ ADD THIS - was missing!
  scheduleDate: { type: Date, required: true },
  
  location:    { type: String, required: true },
  status:      { type: String, default: 'Pending' },
  verifiedAt:  { type: Date,   default: null },
  createdAt:   { type: Date,   default: Date.now },
  photoId:     { type: String },
});

module.exports = mongoose.model('FaciAttendance', faciAttendanceSchema);