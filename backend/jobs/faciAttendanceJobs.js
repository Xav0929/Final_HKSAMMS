const cron = require('node-cron');
const moment = require('moment');
const Duty = require('../models/duty');
const FaciAttendance = require('../models/FaciAttendance');

const TIMEZONE = 'Asia/Manila';
let jobsScheduled = false;

const getDayBounds = (date) => ({
  start: moment(date).startOf('day').toDate(),
  end: moment(date).endOf('day').toDate(),
});

const markAbsentFacilitators = async () => {
  const targetDay = moment().subtract(1, 'day');
  const dayName = targetDay.format('dddd');
  const { start, end } = getDayBounds(targetDay);

  try {
    const duties = await Duty.find({
      dutyType: { $ne: 'Attendance Checker' },
      status: 'Active',
      day: dayName,
    }).lean();

    if (!duties.length) {
      return;
    }

    for (const duty of duties) {
      const studentId = duty.id;
      if (!studentId) continue;

      const existingRecord = await FaciAttendance.findOne({
        studentId,
        scheduleDate: { $gte: start, $lte: end },
      });

      if (existingRecord) {
        if (existingRecord.status === 'Present' || existingRecord.status === 'Absent') {
          continue;
        }

        existingRecord.status = 'Absent';
        if (!existingRecord.location) {
          existingRecord.location = duty.room || 'Unassigned';
        }
        existingRecord.scheduleDate = start;
        existingRecord.checkInTime = start;
        existingRecord.photoUrl = existingRecord.photoUrl || null;
        existingRecord.verifiedAt = existingRecord.verifiedAt || null;
        await existingRecord.save();
        continue;
      }

      await FaciAttendance.create({
        studentId,
        studentName: duty.name || 'Unknown Facilitator',
        location: duty.room || 'Unassigned',
        scheduleDate: start,
        checkInTime: end,
        status: 'Absent',
        photoUrl: null,
        verifiedAt: null,
      });
    }
  } catch (error) {
    console.error('FaciAttendance absence job error:', error);
  }
};

const scheduleFaciAttendanceJobs = () => {
  if (jobsScheduled) return;

  cron.schedule(
    '5 0 * * *',
    () => {
      markAbsentFacilitators();
    },
    {
      timezone: TIMEZONE,
    }
  );

  jobsScheduled = true;
};

module.exports = scheduleFaciAttendanceJobs;

