// routes/selfAttendance.js
const express = require("express");
const router = express.Router();
const SelfAttendance = require("../models/selfAttendance");
const Scholar = require("../models/scholar");
const User = require("../models/user");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Upload path: Local = ./uploads, Vercel = /tmp/uploads
const isVercel = process.env.VERCEL || process.env.NODE_ENV === "production";
const uploadDir = isVercel ? "/tmp/uploads" : path.join(__dirname, "../uploads");

// Create folder
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"));
  },
});

// JWT Verify → Get scholarId from User.username
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select("username");
    if (!user || !user.username) return res.status(404).json({ message: "User not found" });

    const scholar = await Scholar.findOne({ id: user.username });
    if (!scholar) return res.status(404).json({ message: "Scholar not found" });

    req.scholarId = scholar.id;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// POST: Add attendance
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No photo" });

    const { time, latitude, longitude, address } = req.body;
    if (!time || !latitude || !longitude) return res.status(400).json({ message: "Missing fields" });

    const photoUrl = `/uploads/${req.file.filename}`;

    const record = new SelfAttendance({
      scholarId: req.scholarId,
      photoUrl,
      time,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || "",
    });

    await record.save();
    res.status(201).json({ message: "Attendance recorded" });
  } catch (err) {
    console.error("Save error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// GET: Fetch only THIS user's records
router.get("/my", verifyToken, async (req, res) => {
  try {
    const records = await SelfAttendance.find({ scholarId: req.scholarId })
      .sort({ createdAt: -1 })
      .select("photoUrl time latitude longitude address")
      .lean();

    const baseUrl = isVercel ? `https://${req.headers.host}` : "http://localhost:8000";

    const formatted = records.map(r => ({
      ...r,
      photoUrl: `${baseUrl}${r.photoUrl}`,
      studentId: req.scholarId,
    }));

    res.json({ records: formatted });
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;