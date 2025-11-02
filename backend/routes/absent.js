// routes/absent.js
const express = require('express');
const router = express.Router();
const Absent = require('../models/Absent');
const FaciAttendance = require('../models/FaciAttendance');
const auth = require('../middleware/auth');


/**
 * GET /api/absent?studentId=SF12345
 * Returns total absence count for a student
 */
router.get('/', auth, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ message: 'studentId query parameter is required' });
    }

    const count = await Absent.countDocuments({ studentId });
    res.json({ count });
  } catch (err) {
    console.error('GET /api/absent error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/absent
 * Bulk upsert absences (idempotent)
 * Body: Array of { studentId, date, room, time }
 */
router.post('/', auth, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];

    // Validate required fields
    for (const item of items) {
      const { studentId, date, room, time } = item;
      if (!studentId || !date || !room || !time) {
        return res.status(400).json({
          message: 'Each item must have: studentId, date, room, time',
        });
      }
    }

    // Prepare bulk upsert operations
    const operations = items.map(item => ({
      updateOne: {
        filter: {
          studentId: item.studentId,
          date: new Date(item.date),
          room: item.room,
          time: item.time,
        },
        update: {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            studentId: item.studentId,
            date: new Date(item.date),
            room: item.room,
            time: item.time,
          },
        },
        upsert: true,
      },
    }));

    const result = await Absent.bulkWrite(operations);

    // === FORGIVE ONE ABSENCE IF PRESENT EXISTS ===
    const studentIds = [...new Set(items.map(i => i.studentId))];
    for (const sid of studentIds) {
      const hasPresent = await FaciAttendance.findOne({
        studentId: sid,
        status: 'Present'
      });
      if (hasPresent) {
        await Absent.deleteOne({ studentId: sid }).sort({ date: 1 }); // delete oldest
      }
    }

    res.status(201).json({
      message: 'Absences recorded successfully',
      saved: items.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error('POST /api/absent error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/absent/list?studentId=SF12345
 * Returns full list of absences (for UI)
 */
router.get('/list', auth, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ message: 'studentId required' });
    }

    const absences = await Absent.find({ studentId })
      .select('date room time createdAt')
      .sort({ date: -1 })
      .lean();

    // Format date for frontend
    const formatted = absences.map(a => ({
      ...a,
      date: new Date(a.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('GET /api/absent/list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;