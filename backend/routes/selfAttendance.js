/* ────────────────────── routes/selfAttendance.js ────────────────────── */
const express = require("express");
const router = express.Router();
const SelfAttendance = require("../models/selfAttendance");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

/* ---------- Multer config ---------- */
const uploadDir = path.join(__dirname, "../uploads");          // <-- one level up from routes/
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed"));
  },
});

/* ---------- Token middleware ---------- */
const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.split(" ")[1] : null;
  if (!token) return res.status(401).json({ message: "No token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.userId = decoded._id;
    next();
  });
};

/* ---------- POST /api/selfAttendance/add ---------- */
router.post("/add", verifyToken, upload.single("photo"), async (req, res) => {

  try {
   console.log("HEADERS:", req.headers);
  console.log("FILES?", !!req.file);
  console.log("BODY KEYS:", Object.keys(req.body));

    if (!req.file) {
      return res.status(400).json({ message: "No photo uploaded – field must be named 'photo'" });
    }

    const { time, latitude, longitude, address } = req.body;
    if (!time || !latitude || !longitude) {
      return res.status(400).json({ message: "Missing required fields: time, latitude, longitude" });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    const record = new SelfAttendance({
      userId: req.userId,
      photoUrl,
      time,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || "",
    });

    await record.save();

    res.status(201).json({ message: "Self Attendance recorded", data: record });
  } catch (err) {
    console.error("Error saving selfAttendance:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;