const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/emailService");
require("dotenv").config();

const { JWT_SECRET } = process.env;

// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Username and password are required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "User not found" });

    // Deactivated account
    if (user.status && user.status.toLowerCase() === "inactive") {
      console.log("EMAIL SENT: Account Deactivated Warning");
      console.log(`To: ${user.email}`);
      console.log(`Username: ${user.username}`);
      console.log("---");

      await sendEmail({
        to: user.email,
        subject: "Account Deactivated - HK-SAMMS",
        text: `Hello ${user.username},\n\nYour account has been deactivated. Please contact admin for reactivation.`,
      });

      return res.status(403).json({ message: "Your account is deactivated. Check your email." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: "1d" });

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
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- SEND OTP ----------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // LOG BEFORE SENDING
    console.log("SENDING EMAIL: OTP Code");
    console.log(`To: ${email}`);
    console.log(`Username: ${user.username}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires in: 10 minutes`);
    console.log("---");

    // LET sendEmail() HANDLE LOGGING ON SUCCESS
    await sendEmail({
      to: email,
      subject: "Your OTP Code - HK-SAMMS",
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ 
      message: "Failed to send OTP", 
      error: error.message 
    });
  }
});
// ---------------- VERIFY OTP ----------------
router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log("Verify request:", { email, code });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    console.log("User OTP in DB:", user.otp);
    console.log("OTP Expiry:", new Date(user.otpExpires).toLocaleString());

    if (user.otp !== code) {
      console.log("Verification failed: Invalid OTP");
      return res.status(400).json({ message: "Invalid verification code" });
    }
    if (user.otpExpires < Date.now()) {
      console.log("Verification failed: OTP expired");
      return res.status(400).json({ message: "Verification code expired" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    console.log("OTP verified successfully for:", email);
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
    console.log("Reset password request for:", email);

    if (!newPassword) {
      console.log("Missing new password");
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("No user found for email:", email);
      return res.status(404).json({ message: "Email not found" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log("Password updated for:", user.email);

    // EMAIL LOGGING
    console.log("EMAIL SENT: Password Reset Confirmation");
    console.log(`To: ${email}`);
    console.log(`Username: ${user.username}`);
    console.log("---");

    await sendEmail({
      to: email,
      subject: "Password Reset Confirmation - HK-SAMMS",
      text: `Hello ${user.username},\n\nYour password has been successfully reset. If you did not initiate this change, please contact support immediately.\n\n— HK-SAMMS Team`,
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;