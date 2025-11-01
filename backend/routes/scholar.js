const express = require('express');
const router = express.Router();
const Scholar = require('../models/scholar');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utils/emailService');
require('dotenv').config();

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

  if (!name || !id || !email || !year || !course || !duty || !password)
    return res.status(400).json({ message: 'All fields are required' });

  let userRole = 'checker';
  if (role && ['admin', 'checker', 'facilitator'].includes(role.toLowerCase())) {
    userRole = role.toLowerCase();
  } else {
    const dutyLower = duty.toLowerCase();
    if (dutyLower.includes('facilitator')) userRole = 'facilitator';
    else if (dutyLower.includes('admin')) userRole = 'admin';
    else if (dutyLower.includes('checker')) userRole = 'checker';
  }

  try {
    const existingScholar = await Scholar.findOne({ $or: [{ id }, { email }] });
    const existingUser = await User.findOne({ $or: [{ email }, { username: id }, { employeeId: id }] });

    if (existingScholar || existingUser)
      return res.status(400).json({ message: 'Scholar or user with this ID/email already exists' });

    const newScholar = await Scholar.create({ name, id, email, year, course, duty, status: 'Active' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username: id.toString(),
      employeeId: userRole === 'admin' ? id.toString() : undefined,
      email,
      password: hashedPassword,
      role: userRole,
      status: 'Active',
    });

    await sendEmail({
      to: email,
      subject: 'Account Created - HK-SAMMS',
      text: `Hello ${name},\n\nYour account has been successfully created.\n\nUsername: ${id}\nPlease use your registered password to log in.\n\nWelcome aboard!\n\n— HK-SAMMS Team`,
    });

    res.status(201).json({ message: 'Scholar and user created successfully', scholar: newScholar });
  } catch (err) {
    console.error('❌ Error creating scholar:', err);
    res.status(500).json({ message: 'Failed to create scholar or user', error: err.message });
  }
});

// ✅ Update scholar + user + send change notification
router.put('/:id', async (req, res) => {
  try {
    const scholar = await Scholar.findById(req.params.id);
    if (!scholar) return res.status(404).json({ message: 'Scholar not found' });

    const updates = req.body;
    const user = await User.findOne({ username: scholar.id.toString() });
    const changes = [];

    const fields = ['name', 'id', 'email', 'year', 'course', 'duty'];
    for (const field of fields) {
      if (updates[field] && updates[field] !== scholar[field]) {
        changes.push(`${field} changed from "${scholar[field]}" to "${updates[field]}"`);
      }
    }

    Object.assign(scholar, updates);
    await scholar.save();

    if (user) {
      user.username = updates.id?.toString() || user.username;
      user.employeeId = updates.role === 'admin' ? updates.id?.toString() || user.employeeId : null;
      user.email = updates.email || user.email;
      if (updates.role && ['admin', 'checker', 'facilitator'].includes(updates.role))
        user.role = updates.role;
      if (updates.password) user.password = await bcrypt.hash(updates.password, 10);
      await user.save();

      if (changes.length > 0) {
        await sendEmail({
          to: user.email,
          subject: 'Account Updated - HK-SAMMS',
          text: `Hello ${user.username},\n\nYour account details have been updated:\n${changes
            .map(c => `- ${c}`)
            .join('\n')}\n\nIf this wasn't you, contact admin.\n\n— HK-SAMMS Team`,
        });
      }
    }

    res.json({ message: 'Scholar and linked user updated successfully', scholar });
  } catch (err) {
    console.error('❌ Error updating scholar:', err);
    res.status(500).json({ message: 'Failed to update scholar', error: err.message });
  }
});

// ✅ Toggle scholar/user status + send email
router.patch('/:id/status', async (req, res) => {
  try {
    const scholar = await Scholar.findById(req.params.id);
    if (!scholar) return res.status(404).json({ message: 'Scholar not found' });

    const previousStatus = scholar.status;
    const newStatus = previousStatus === 'Active' ? 'Inactive' : 'Active';
    scholar.status = newStatus;
    await scholar.save();

    const user = await User.findOne({ username: scholar.id.toString() });
    if (user) {
      user.status = newStatus;
      await user.save();

      const subject =
        newStatus === 'Inactive'
          ? 'Account Deactivated - HK-SAMMS'
          : 'Account Reactivated - HK-SAMMS';
      const text =
        newStatus === 'Inactive'
          ? `Hello ${user.username},\n\nYour account has been deactivated by the admin. You will not be able to log in until it is reactivated.\n\n— HK-SAMMS Team`
          : `Hello ${user.username},\n\nGood news! Your account has been reactivated by the admin. You may now log in again.\n\nWelcome back!\n\n— HK-SAMMS Team`;

      await sendEmail({ to: user.email, subject, text });
    }

    res.json({ message: 'Status updated successfully', scholar });
  } catch (err) {
    console.error('❌ Error updating scholar status:', err);
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// ✅ Get single scholar by ID field (not Mongo _id)
router.get('/:id', async (req, res) => {
  try {
    const scholar = await Scholar.findOne({ id: req.params.id });
    res.json({ exists: !!scholar, scholar });
  } catch (err) {
    console.error('❌ Error fetching scholar:', err);
    res.status(500).json({ message: 'Failed to fetch scholar', error: err.message });
  }
});

// ✅ Count scholars created in specific month
router.get('/count-by-month', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month)
      return res.status(400).json({ message: 'year and month required' });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const count = await Scholar.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to count scholars', error: err.message });
  }
});

module.exports = router;
