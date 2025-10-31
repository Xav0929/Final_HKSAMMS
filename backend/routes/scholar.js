const express = require('express');
const router = express.Router();
const Scholar = require('../models/scholar');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { EMAIL_USER, EMAIL_PASS } = process.env;

// ✅ Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// Check transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter connection failed:', error);
  } else {
    console.log('✅ Email transporter ready');
  }
});

// ✅ Get all scholars
router.get('/', async (req, res) => {
  try {
    const scholars = await Scholar.find().sort({ createdAt: -1 });
    res.json(scholars);
  } catch (err) {
    console.error('❌ Error fetching scholars:', err);
    res.status(500).json({ message: 'Failed to fetch scholars', error: err.message });
  }
});

// ✅ Add new scholar + auto-create user + send welcome email
router.post('/', async (req, res) => {
  const { name, id, email, year, course, duty, password, role } = req.body;

  console.log('📥 Received POST request with body:', req.body);

  if (!name || !id || !email || !year || !course || !duty || !password) {
    console.error('❌ Missing required fields:', { name, id, email, year, course, duty, password });
    return res.status(400).json({ message: 'All fields are required (name, id, email, year, course, duty, password)' });
  }

  let userRole = 'checker'; // default fallback
  if (role && ['admin', 'checker', 'facilitator'].includes(role.toLowerCase())) {
    userRole = role.toLowerCase();
  } else if (duty) {
    const dutyLower = duty.toLowerCase();
    if (dutyLower.includes('facilitator')) userRole = 'facilitator';
    else if (dutyLower.includes('admin')) userRole = 'admin';
    else if (dutyLower.includes('checker')) userRole = 'checker';
  }

  console.log(`🧠 Mapped duty "${duty}" → role "${userRole}"`);

  try {
    const existingScholar = await Scholar.findOne({ $or: [{ id }, { email }] });
    if (existingScholar) {
      console.error('❌ Scholar already exists with ID or email:', { id, email });
      return res.status(400).json({ message: 'Scholar with this ID or email already exists' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username: id }, { employeeId: id }] });
    if (existingUser) {
      console.error('❌ User already exists with email, username, or employeeId:', { email, id });
      return res.status(400).json({ message: 'User with this email or ID already exists' });
    }

    const newScholar = new Scholar({ name, id, email, year, course, duty, status: 'Active' });
    const savedScholar = await newScholar.save();
    console.log('✅ Scholar created:', savedScholar);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: id.toString(),
      employeeId: userRole === 'admin' ? id.toString() : undefined,
      email,
      password: hashedPassword,
      role: userRole,
      status: 'Active',
    });

    await newUser.save();
    console.log(`✅ User created for ${email} with username: ${id}, role: ${userRole}, employeeId: ${newUser.employeeId}`);

    try {
      await transporter.sendMail({
        from: `"HK-SAMMS" <${EMAIL_USER}>`,
        to: email,
        subject: 'Account Created - HK-SAMMS',
        text: `Hello ${name},\n\nYour account has been successfully created.\n\nUsername: ${id}\nPlease use your registered password to log in.\n\nWelcome aboard!\n\n— HK-SAMMS Team`,
      });
      console.log(`📧 Welcome email sent to ${email}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send welcome email to ${email}:`, emailErr);
    }

    res.status(201).json({
      message: 'Scholar and user created successfully',
      scholar: savedScholar,
    });
  } catch (err) {
    console.error('❌ Error in POST /scholars:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Duplicate ID or email detected', error: err.message });
    }
    res.status(500).json({ message: 'Failed to create scholar or user', error: err.message });
  }
});

// ✅ Update scholar + update user + send update notification email
router.put('/:id', async (req, res) => {
  try {
    console.log('📥 Received PUT request with body:', req.body);
    const scholar = await Scholar.findById(req.params.id);
    if (!scholar) {
      console.error('❌ Scholar not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Scholar not found' });
    }

    console.log('🔍 Scholar before update:', scholar);
    const oldId = scholar.id;
    const oldEmail = scholar.email;
    const updates = req.body;

    // Track changes for email notification
    const changes = [];
    if (updates.name && updates.name !== scholar.name) changes.push(`Name changed from "${scholar.name}" to "${updates.name}"`);
    if (updates.id && updates.id !== scholar.id) changes.push(`ID changed from "${scholar.id}" to "${updates.id}"`);
    if (updates.email && updates.email !== scholar.email) changes.push(`Email changed from "${scholar.email}" to "${updates.email}"`);
    if (updates.year && updates.year !== scholar.year) changes.push(`Year changed from "${scholar.year}" to "${updates.year}"`);
    if (updates.course && updates.course !== scholar.course) changes.push(`Course changed from "${scholar.course}" to "${updates.course}"`);
    if (updates.duty && updates.duty !== scholar.duty) changes.push(`Duty changed from "${scholar.duty}" to "${updates.duty}"`);

    // Handle role changes (compare with user.role, not scholar.role)
    const user = await User.findOne({ username: oldId.toString() });
    if (user && updates.role && updates.role !== user.role && ['admin', 'checker', 'facilitator'].includes(updates.role)) {
      changes.push(`Role changed from "${user.role}" to "${updates.role}"`);
    }

    console.log('🔍 Detected changes:', changes);

    Object.assign(scholar, updates);
    const updatedScholar = await scholar.save();
    console.log('✅ Scholar updated:', updatedScholar);

    if (user) {
      console.log('🔍 Found user:', user);
      user.username = updates.id?.toString() || user.username;
      user.employeeId = updates.role === 'admin' ? updates.id?.toString() || user.employeeId : null;
      user.email = updates.email || user.email;
      user.role = updates.role && ['admin', 'checker', 'facilitator'].includes(updates.role) ? updates.role : user.role;

      if (updates.password) {
        const hashedPassword = await bcrypt.hash(updates.password, 10);
        user.password = hashedPassword;
        changes.push('Password updated');
      }

      await user.save();
      console.log(`✅ User updated for ${user.email}, role: ${user.role}, employeeId: ${user.employeeId}`);

      // Send email notification if there are changes
      if (changes.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
          console.error(`❌ Invalid email address: ${user.email}`);
          return res.status(400).json({ message: 'Invalid email address for user' });
        }

        try {
          await transporter.sendMail({
            from: `"HK-SAMMS" <${EMAIL_USER}>`,
            to: user.email,
            subject: 'Account Updated - HK-SAMMS',
            text: `Hello ${user.username},\n\nYour account details have been updated.\n\nChanges made:\n${changes.map(change => `- ${change}`).join('\n')}\n\nIf you did not request these changes, please contact the admin.\n\n— HK-SAMMS Team`,
          });
          console.log(`📧 Update notification email sent to ${user.email}`);
        } catch (emailErr) {
          console.error(`❌ Failed to send update notification email to ${user.email}:`, emailErr);
        }
      } else {
        console.log(`⚠️ No relevant changes to notify for ${user.email}`);
      }
    } else if (updates.email && updates.id && updates.password) {
      console.log('🔍 No user found, creating new user');
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      const newUser = new User({
        username: updates.id.toString(),
        employeeId: updates.role === 'admin' ? updates.id.toString() : null,
        email: updates.email,
        password: hashedPassword,
        role: updates.role && ['admin', 'checker', 'facilitator'].includes(updates.role) ? updates.role : 'checker',
        status: scholar.status || 'Active',
      });
      await newUser.save();
      console.log(`✅ New user created during update for ${updates.email}, role: ${newUser.role}, employeeId: ${newUser.employeeId}`);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        console.error(`❌ Invalid email address: ${updates.email}`);
        return res.status(400).json({ message: 'Invalid email address for new user' });
      }

      try {
        await transporter.sendMail({
          from: `"HK-SAMMS" <${EMAIL_USER}>`,
          to: updates.email,
          subject: 'Account Created - HK-SAMMS',
          text: `Hello ${updates.name},\n\nYour account has been created during an update.\n\nUsername: ${updates.id}\nPlease use your registered password to log in.\n\nWelcome aboard!\n\n— HK-SAMMS Team`,
        });
        console.log(`📧 Welcome email sent to ${updates.email}`);
      } catch (emailErr) {
        console.error(`❌ Failed to send welcome email to ${updates.email}:`, emailErr);
      }
    } else {
      console.log(`⚠️ No user found for scholar ID: ${oldId}, and insufficient data to create new user`);
    }

    res.json({
      message: 'Scholar and linked user updated successfully',
      scholar: updatedScholar,
    });
  } catch (err) {
    console.error('❌ Error updating scholar and user:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Duplicate ID or email detected during update', error: err.message });
    }
    res.status(400).json({ message: 'Failed to update scholar or user', error: err.message });
  }
});

// ✅ Toggle scholar + linked user status + send email notifications
router.patch('/:id/status', async (req, res) => {
  try {
    const scholar = await Scholar.findById(req.params.id);
    if (!scholar) {
      console.error('❌ Scholar not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Scholar not found' });
    }

    const previousStatus = scholar.status;
    const newStatus = scholar.status === 'Active' ? 'Inactive' : 'Active';

    scholar.status = newStatus;
    await scholar.save();
    console.log(`✅ Scholar status updated to ${newStatus} for ID: ${scholar.id}`);

    const user = await User.findOne({ username: scholar.id.toString() });
    if (user) {
      user.status = newStatus;
      await user.save();
      console.log(`✅ User status updated for ${user.username}: ${newStatus}`);

      try {
        if (newStatus === 'Inactive') {
          await transporter.sendMail({
            from: `"HK-SAMMS" <${EMAIL_USER}>`,
            to: user.email,
            subject: 'Account Deactivated - HK-SAMMS',
            text: `Hello ${user.username},\n\nYour account has been deactivated by the admin.\nYou will not be able to log in until it is reactivated.\n\n— HK-SAMMS Team`,
          });
          console.log(`📧 Deactivation email sent to ${user.email}`);
        } else if (previousStatus === 'Inactive' && newStatus === 'Active') {
          await transporter.sendMail({
            from: `"HK-SAMMS" <${EMAIL_USER}>`,
            to: user.email,
            subject: 'Account Reactivated - HK-SAMMS',
            text: `Hello ${user.username},\n\nGood news! Your account has been reactivated by the admin.\nYou may now log in again.\n\nWelcome back!\n\n— HK-SAMMS Team`,
          });
          console.log(`📬 Reactivation email sent to ${user.email}`);
        }
      } catch (emailErr) {
        console.error(`❌ Failed to send status email to ${user.email}:`, emailErr);
      }
    } else {
      console.error(`❌ No linked user found for scholar ID: ${scholar.id}. Cannot create user without a password.`);
      return res.status(400).json({
        message: 'No linked user found for scholar. Please update the scholar with a password to create a user.',
      });
    }

    res.json({
      message: 'Status updated successfully',
      scholar,
    });
  } catch (err) {
    console.error('❌ Error updating scholar status:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Duplicate ID or email detected during status update', error: err.message });
    }
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// ✅ Get a single scholar by student ID (custom field `id`)
router.get('/:id', async (req, res) => {
  try {
    const scholar = await Scholar.findOne({ id: req.params.id });
    if (scholar) {
      res.json({ exists: true, scholar });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('❌ Error fetching scholar by ID:', err);
    res.status(500).json({ message: 'Failed to fetch scholar', error: err.message });
  }
});

// ✅ Test email route for debugging
router.get('/test-email', async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"HK-SAMMS" <${EMAIL_USER}>`,
      to: 'test@example.com', // Replace with a valid test email
      subject: 'Test Email - HK-SAMMS',
      text: 'This is a test email from HK-SAMMS.',
    });
    res.json({ message: 'Test email sent' });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
  
});
// GET /api/scholars/count-by-month?year=2025&month=10
router.get('/count-by-month', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ message: 'year and month required' });

    const start = new Date(year, month - 1, 1); // 1st of month
    const end = new Date(year, month, 0);       // last day of month

    const count = await Scholar.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to count', error: err.message });
  }
});
module.exports = router;