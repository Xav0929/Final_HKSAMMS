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
const selfAttendanceRoutes = require("./routes/selfAttendance");
const path = require("path");


const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'Final-Project',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scholars', scholarRoutes);
app.use("/api/duties", dutyRoutes);
app.use("/api/users", userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/checkerAttendance', checkerAttendanceRoutes);
app.use('/api/faci-attendance', FaciAttendanceRoutes);
app.use('/api/absents', absentRoutes);
app.use("/api/selfAttendance", selfAttendanceRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


