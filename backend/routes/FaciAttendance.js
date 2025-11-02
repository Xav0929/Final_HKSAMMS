const express = require('express');
const moment = require('moment');
const router = express.Router();
const FaciAttendance = require('../models/FaciAttendance');
const CheckerAttendance = require('../models/checkerAttendance');

const buildDayBounds = (input) => {
  const base = moment(input);
  if (!base.isValid()) {
    const today = moment();
    return {
      start: today.startOf('day').toDate(),
      end: today.endOf('day').toDate(),
    };
  }
  return {
    start: base.clone().startOf('day').toDate(),
    end: base.clone().endOf('day').toDate(),
  };
};

const normaliseScheduleDate = (input) => {
  const bounds = buildDayBounds(input);
  return bounds.start;
};

const buildQueryFromParams = ({ studentId, status, startDate, endDate }) => {
  const query = {};
  if (studentId) query.studentId = studentId;
  if (status) query.status = status;

  if (startDate || endDate) {
    const range = {};
    if (startDate) range.$gte = moment(startDate).startOf('day').toDate();
    if (endDate) range.$lte = moment(endDate).endOf('day').toDate();
    query.scheduleDate = range;
  }

  return query;
};

const mapDailyAggregation = (aggregated, order) => {
  const lookup = new Map();
  aggregated.forEach((row) => {
    lookup.set(row._id, {
      date: row._id,
      present: row.present || 0,
      absent: row.absent || 0,
      total: row.total || 0,
    });
  });

  return order.map((dateKey) => {
    const entry = lookup.get(dateKey) || { present: 0, absent: 0, total: 0 };
    const total = entry.total || entry.present + entry.absent;
    const rate = total > 0 ? Number(((entry.present / total) * 100).toFixed(1)) : 0;
    return { date: dateKey, present: entry.present, absent: entry.absent, total, rate };
  });
};

router.get('/', async (req, res) => {
  try {
    const query = buildQueryFromParams(req.query);
    const records = await FaciAttendance.find(query).sort({ scheduleDate: -1, checkInTime: -1 });
    res.json(records);
  } catch (error) {
    console.error('FaciAttendance GET error:', error);
    res.status(500).json({ message: 'Error fetching records', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      status = 'Pending',
      scheduleDate,
      checkInTime,
      photoUrl = null,
      verifiedAt = null,
    } = req.body;

    if (!studentId || !studentName) {
      return res.status(400).json({ message: 'studentId and studentName are required.' });
    }

    const schedule = normaliseScheduleDate(scheduleDate || checkInTime || Date.now());
    const { start, end } = buildDayBounds(schedule);

    const existingRecord = await FaciAttendance.findOne({
      studentId,
      scheduleDate: { $gte: start, $lte: end },
    });

    const payload = {
      studentId,
      studentName,
      status,
      photoUrl,
      scheduleDate: schedule,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      verifiedAt,
    };

    if (existingRecord) {
      Object.assign(existingRecord, payload);
      const updated = await existingRecord.save();
      return res.status(200).json(updated);
    }

    const newRecord = new FaciAttendance(payload);
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    console.error('FaciAttendance POST error:', error);
    res.status(400).json({ message: 'Error saving record', error: error.message });
  }
});

router.post('/photo', async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      photoUrl: rawBase64,
      scheduleDate,
      forcePhoto = false,
    } = req.body;

    if (!studentId || !studentName || !rawBase64) {
      return res.status(400).json({ message: 'studentId, studentName, and photoUrl are required.' });
    }

    const schedule = normaliseScheduleDate(scheduleDate || Date.now());
    const { start, end } = buildDayBounds(schedule);

    // === BYPASS CHECKER CHECK ===
    /*
    const checkerPresent = await CheckerAttendance.exists({
      checkInTime: { $gte: start, $lte: end },
    });

    if (checkerPresent && !forcePhoto) {
      return res.status(409).json({
        message: 'Attendance checker is available. Please use QR check-in.',
      });
    }
    */
    // =============================

    const photoUrl = `data:image/jpeg;base64,${rawBase64}`;
    const photoTimestamp = new Date();

    // Self-attendance validation: check if photo timestamp is within scheduleDate
    const scheduleDay = moment(schedule).startOf('day');
    const photoDay = moment(photoTimestamp).startOf('day');
    
    // Determine status based on whether photo timestamp is within scheduleDate
    let status = 'Pending';
    if (scheduleDay.isSame(photoDay, 'day')) {
      status = 'Present'; // Self-attendance: photo taken within scheduleDate
    }

    const existingRecord = await FaciAttendance.findOne({
      studentId,
      scheduleDate: { $gte: start, $lte: end },
    });

    if (existingRecord) {
      existingRecord.status = status;
      existingRecord.photoUrl = photoUrl;
      existingRecord.scheduleDate = schedule;
      existingRecord.checkInTime = photoTimestamp;
      existingRecord.verifiedAt = photoTimestamp;
      const updated = await existingRecord.save();
      return res.status(200).json(updated);
    }

    const newRecord = new FaciAttendance({
      studentId,
      studentName,
      photoUrl,
      status: status,
      scheduleDate: schedule,
      checkInTime: photoTimestamp,
      verifiedAt: photoTimestamp,
    });

    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    console.error('FaciAttendance photo POST error:', error);
    res.status(400).json({ message: 'Error saving photo attendance', error: error.message });
  }
});

router.get('/summary/daily', async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;
    const start = startDate ? moment(startDate).startOf('day') : moment().subtract(6, 'days').startOf('day');
    const end = endDate ? moment(endDate).endOf('day') : moment().endOf('day');

    const match = {
      scheduleDate: { $gte: start.toDate(), $lte: end.toDate() },
    };
    if (studentId) match.studentId = studentId;

    const aggregated = await FaciAttendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduleDate' } },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Present'] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dayOrder = [];
    const cursor = start.clone();
    while (cursor.isSameOrBefore(end, 'day')) {
      dayOrder.push(cursor.format('YYYY-MM-DD'));
      cursor.add(1, 'day');
    }

    const data = mapDailyAggregation(aggregated, dayOrder);
    res.json(data);
  } catch (error) {
    console.error('FaciAttendance summary/daily error:', error);
    res.status(500).json({ message: 'Error building daily summary', error: error.message });
  }
});

router.get('/summary/weekly-trend', async (req, res) => {
  try {
    const { studentId, days = 7 } = req.query;
    const totalDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 30);
    const end = moment().endOf('day');
    const start = end.clone().subtract(totalDays - 1, 'days').startOf('day');

    const match = {
      scheduleDate: { $gte: start.toDate(), $lte: end.toDate() },
    };
    if (studentId) match.studentId = studentId;

    const aggregated = await FaciAttendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduleDate' } },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Present'] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dayOrder = [];
    const cursor = start.clone();
    while (cursor.isSameOrBefore(end, 'day')) {
      dayOrder.push(cursor.format('YYYY-MM-DD'));
      cursor.add(1, 'day');
    }

    const data = mapDailyAggregation(aggregated, dayOrder);
    res.json(data);
  } catch (error) {
    console.error('FaciAttendance summary/weekly-trend error:', error);
    res.status(500).json({ message: 'Error building weekly trend summary', error: error.message });
  }
});

module.exports = router;