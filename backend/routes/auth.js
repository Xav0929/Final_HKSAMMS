const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/emailService"); 
const dotenv = require("dotenv");

dotenv.config();

const { JWT_SECRET} = process.env;


// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Username and password are required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.status && user.status.toLowerCase() === "inactive") {
       await sendEmail({
        to: user.email,
        subject: "Account Deactivated - HK-SAMMS",
        text: `Hello ${user.username},\n\nYour account has been deactivated. Please contact admin for reactivation.`,
      });
      return res.status(403).json({ message: "Your account is deactivated. Check your email." });
    }


    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
      username: user.username,
      employeeId: user.employeeId || "N/A",
      email: user.email,
      status: user.status,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
console.log(`📧 Email sent to ${email}`);

// ---------------- SEND OTP ----------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

     await sendEmail({
      to: email,
      subject: "Your OTP Code - HK-SAMMS",
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
console.log(`📧 Email sent to ${email}`);

// ---------------- VERIFY OTP ----------------
router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log("📩 Verify request:", email, code);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    console.log("🧩 User OTP in DB:", user.otp);
    console.log("🕒 OTP Expiry:", user.otpExpires);

    if (user.otp !== code) return res.status(400).json({ message: "Invalid verification code" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ message: "Verification code expired" });

    // ✅ Clear OTP after verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Code verified successfully" });
  } catch (error) {
    console.error("Verify code error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- RESET PASSWORD ----------------
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    console.log("🔍 Reset password request received for:", email);

    if (!newPassword) {
      console.log("❌ Missing new password");
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ No user found for:", email);
      return res.status(404).json({ message: "Email not found" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    user.otpExpires = null;

    const updatedUser = await user.save();
    console.log("✅ Password successfully updated for:", updatedUser.email);

    // Send confirmation email
    await sendEmail({
      to: email,
      subject: "Password Reset Confirmation - HK-SAMMS",
      text: `Hello ${user.username},\n\nYour password has been successfully reset. If you did not initiate this change, please contact support immediately.\n\n— HK-SAMMS Team`,
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
console.log(`📧 Email sent to ${email}`);

module.exports = router;