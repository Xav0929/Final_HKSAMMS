const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const scholarRoutes = require('./routes/scholar');
const dutyRoutes = require("./routes/duty");
const userRoutes = require("./routes/user");
const attendanceRoutes = require('./routes/attendance');
const checkerAttendanceRoutes = require('./routes/checkerAttendance');
const FaciAttendanceRoutes = require('./routes/FaciAttendance');
const absentRoutes = require('./routes/absent');
const scheduleFaciAttendanceJobs = require('./jobs/faciAttendanceJobs');

const app = express();
const PORT = process.env.PORT || 8000;

// ────────────────────── Middleware ──────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));          // a little more room for photos
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ────────────────────── MongoDB Connection ──────────────────────
const db = mongoose.connection;

mongoose.connect(process.env.MONGO_URI, {
  dbName: 'Final-Project',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connected');
    // ←←← CRITICAL: make the raw connection available to GridFS routes
    app.locals.db = db;
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Optional health-check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ────────────────────── Routes ──────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/scholars', scholarRoutes);
app.use("/api/duties", dutyRoutes);
app.use("/api/users", userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/checkerAttendance', checkerAttendanceRoutes);
app.use('/api/faci-attendance', FaciAttendanceRoutes);
app.use('/api/absent', absentRoutes);


// ────────────────────── Jobs ──────────────────────
scheduleFaciAttendanceJobs();

// ────────────────────── Start Server ──────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});