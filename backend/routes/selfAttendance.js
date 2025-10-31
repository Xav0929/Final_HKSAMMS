const express = require("express");
const router = express.Router();
const SelfAttendance = require("../models/selfAttendance");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

// ✅ Upload folder
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ✅ Verify token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.userId = decoded._id;
    next();
  });
}

// ✅ POST /api/selfAttendance/add
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  try {
    const { time, latitude, longitude, address } = req.body;
    const photoUrl = `/uploads/${req.file.filename}`;

    const record = new SelfAttendance({
      userId: req.userId,
      photoUrl,
      time,
      latitude,
      longitude,
      address,
    });

    await record.save();
    res.status(201).json({ message: "Self Attendance recorded", data: record });
  } catch (err) {
    console.error("❌ Error saving selfAttendance:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
