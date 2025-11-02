const express = require('express');
const router = express.Router();
const Attendance = require('../models/attendance');
const moment = require('moment');

// POST: Save a new attendance record
router.post('/', async (req, res) => {
  try {
    const { studentId, encodedTime } = req.body;

    // Standardize encodedTime to ensure exact match (MM/DD/YYYY hh:mm A)
    const formattedTime = moment(encodedTime, 'MM/DD/YYYY hh:mm A').format('MM/DD/YYYY hh:mm A');
    console.log(`Checking for exact match: studentId=${studentId}, encodedTime=${formattedTime}`);

    // Check for exact same studentId and encodedTime
    const exactMatch = await Attendance.findOne({
      studentId,
      encodedTime: formattedTime,
    });

    if (exactMatch) {
      console.log(`Exact match found: ${JSON.stringify(exactMatch)}`);
      return res.status(400).json({ error: 'User already checked in at this exact time.' });
    }

    // Extract day from encodedTime
    const newRecordDay = moment(encodedTime, 'MM/DD/YYYY hh:mm A').format('YYYY-MM-DD');

    // Check for existing record with same studentId and day (for 5-minute rule)
    const existingRecord = await Attendance.findOne({
      studentId,
      encodedTime: { $regex: `^${newRecordDay}` },
    });

    if (existingRecord) {
      const existingTime = moment(existingRecord.encodedTime, 'MM/DD/YYYY hh:mm A');
      const newTime = moment(encodedTime, 'MM/DD/YYYY hh:mm A');
      const timeDiff = Math.abs(newTime.diff(existingTime, 'minutes'));

      if (timeDiff < 5) {
        console.log(`5-minute rule violation: timeDiff=${timeDiff} minutes`);
        return res.status(400).json({ error: 'User already checked in within 5 minutes on this day.' });
      }
    }

    const newRecord = new Attendance({ ...req.body, encodedTime: formattedTime });
    await newRecord.save();
    console.log(`Record saved: ${JSON.stringify(newRecord)}`);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error saving record:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET: Fetch all attendance records (with optional month/year filtering)
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};

    // Filter by month and year if provided
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startDate = moment(`${yearNum}-${monthNum}-01`, 'YYYY-M-D').startOf('month');
      const endDate = moment(startDate).endOf('month');

      // Filter by encodedTime string (format: YYYY-MM-DD HH:mm:ss)
      query.encodedTime = {
        $regex: `^${yearNum}-${String(monthNum).padStart(2, '0')}`,
        $options: 'i'
      };
    }

    const records = await Attendance.find(query).sort({ encodedTime: -1 });
    res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching records:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET: Search attendance records by query
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const records = await Attendance.find({
      $or: [
        { studentName: { $regex: query, $options: 'i' } },
        { studentId: { $regex: query, $options: 'i' } },
        { yearLevel: { $regex: query, $options: 'i' } },
        { course: { $regex: query, $options: 'i' } },
        { dutyType: { $regex: query, $options: 'i' } },
        { room: { $regex: query, $options: 'i' } },
        { classStatus: { $regex: query, $options: 'i' } },
        { facilitatorStatus: { $regex: query, $options: 'i' } },
        { encodedTime: { $regex: query, $options: 'i' } },
      ],
    });
    res.status(200).json(records);
  } catch (error) {
    console.error('Error searching records:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET: Fetch latest record by studentId for auto-fill
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const record = await Attendance.findOne({ studentId }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(404).json({ error: 'No record found for this Student ID.' });
    }
    res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching student data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;