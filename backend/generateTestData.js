const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const moment = require("moment");

dotenv.config();

// Import models
const User = require("./models/user");
const Scholar = require("./models/scholar");
const Duty = require("./models/duty");
const Attendance = require("./models/attendance");
const FaciAttendance = require("./models/FaciAttendance");
const CheckerAttendance = require("./models/checkerAttendance");

// Constants
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const COURSES = [
  'BS ACCOUNTANCY',
  'BS HOSPITALITY MANAGEMENT',
  'BS TOURISM MANAGEMENT',
  'BSBA- MARKETING MANAGEMENT',
  'BSBA- BANKING & MICROFINANCE',
  'BACHELOR OF ELEMENTARY EDUCATION',
  'BSED- ENGLISH',
  'BSED- FILIPINO',
  'BS CRIMINOLOGY',
  'BS CIVIL ENGINEERING',
  'BS INFORMATION TECHNOLOGY',
  'BS NURSING',
];
const DUTY_TYPES = ["Student Facilitator", "Attendance Checker"];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"
];
const ROOMS = ["201", "202", "CL1", "CL2", "208", "209",
          "301", "302", "304", "305", "307", "308", "309",
          "401", "402", "403", "404", "405", "CL3", "CL4",
          "408", "409",];

// Helper functions
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStudentId() {
  return `STU${String(randomInt(10000, 99999))}`;
}

function generateName() {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Olivia', 'Robert', 'Sophia', 
                      'William', 'Isabella', 'Richard', 'Mia', 'Joseph', 'Charlotte', 'Thomas', 'Amelia', 'Charles', 'Harper'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                     'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee'];
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

function generateEmail(name, index) {
  const username = name.toLowerCase().replace(/\s+/g, '.');
  return `${username}${index}@phinmaed.com`;
}

// Generate test data
async function generateTestData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear ALL 2024 attendance data for Student Facilitator and Attendance Checker
    console.log("\n🗑️  Clearing ALL 2024 attendance data...");
    
    const start2024 = moment('2024-01-01').startOf('day').toDate();
    const end2024 = moment('2024-12-31').endOf('day').toDate();
    
    // Clear attendance records from 2024 (any format)
    const deletedAttendance2024 = await Attendance.deleteMany({
      $or: [
        { encodedTime: { $regex: /^2024/ } }, // String format: 2024-10-01
        { encodedTime: { $regex: /2024/ } }, // Any occurrence of 2024
        { createdAt: { $gte: start2024, $lte: end2024 } }
      ]
    });
    console.log(`   ✅ Deleted ${deletedAttendance2024.deletedCount} attendance records from 2024`);
    
    // Clear facilitator attendance records from 2024
    const deletedFaci2024 = await FaciAttendance.deleteMany({
      $or: [
        { scheduleDate: { $gte: start2024, $lte: end2024 } },
        { checkInTime: { $gte: start2024, $lte: end2024 } },
        { createdAt: { $gte: start2024, $lte: end2024 } }
      ]
    });
    console.log(`   ✅ Deleted ${deletedFaci2024.deletedCount} facilitator attendance records from 2024`);
    
    // Clear checker attendance records from 2024
    const deletedChecker2024 = await CheckerAttendance.deleteMany({
      $or: [
        { checkInTime: { $gte: start2024, $lte: end2024 } },
        { createdAt: { $gte: start2024, $lte: end2024 } }
      ]
    });
    console.log(`   ✅ Deleted ${deletedChecker2024.deletedCount} checker attendance records from 2024`);
    
    console.log(`\n📊 Total 2024 records deleted: ${deletedAttendance2024.deletedCount + deletedFaci2024.deletedCount + deletedChecker2024.deletedCount}`);

    const createdStudents = [];
    const createdUsers = [];
    const createdDuties = [];
    const createdAttendances = [];
    const createdFaciAttendances = [];
    const createdCheckerAttendances = [];

    // Create 20 students
    console.log("\n📚 Creating 20 students...");
    for (let i = 1; i <= 20; i++) {
      const name = generateName();
      const id = generateStudentId();
      const email = generateEmail(name, i);
      const year = randomElement(YEARS);
      const course = randomElement(COURSES);
      const dutyType = randomElement(DUTY_TYPES);
      const password = "Password@123";

      // Check if student already exists
      let existingScholar = await Scholar.findOne({ id });
      if (existingScholar) {
        console.log(`⚠️  Student ${id} already exists, skipping.`);
        continue;
      }

      // Create scholar
      const scholar = new Scholar({
        name,
        id,
        email,
        year,
        course,
        duty: dutyType,
        remainingHours: 70,
        status: 'Active'
      });
      await scholar.save();
      createdStudents.push(scholar);
      console.log(`✅ Created student ${i}/20: ${name} (${id}) - ${dutyType}`);

      // Create user account
      const hashedPassword = await bcrypt.hash(password, 10);
      const userRole = dutyType === "Student Facilitator" ? "facilitator" : "checker";
      
      let existingUser = await User.findOne({ email });
      if (!existingUser) {
        const user = new User({
          username: id,
          email,
          password: hashedPassword,
          role: userRole,
          status: "Active"
        });
        await user.save();
        createdUsers.push(user);
        console.log(`   ✅ Created ${userRole} user: ${email}`);
      }

      // Create duties (Monday to Friday, random time slots)
      const studentDays = DAYS.slice(); // Copy array
      const numDays = randomInt(3, 5); // Each student has 3-5 days of duty
      const selectedDays = [];
      
      for (let d = 0; d < numDays && studentDays.length > 0; d++) {
        const day = randomElement(studentDays);
        selectedDays.push(day);
        studentDays.splice(studentDays.indexOf(day), 1);
        
        const timeSlot = randomElement(TIME_SLOTS);
        const room = dutyType === "Attendance Checker" ? "N/A" : randomElement(ROOMS);
        
        const duty = new Duty({
          name,
          id,
          course,
          year,
          dutyType,
          day,
          time: timeSlot,
          room,
          status: "Active"
        });
        await duty.save();
        createdDuties.push(duty);
      }
      console.log(`   ✅ Created ${selectedDays.length} duties for ${name}`);
    }

    // Generate attendance data for October 1-31, 2025 (Monday to Friday only)
    console.log("\n📅 Generating attendance records for October 2025...");
    
    const startDate = moment('2025-10-01');
    const endDate = moment('2025-10-31');
    let currentDate = startDate.clone();

    while (currentDate.isSameOrBefore(endDate)) {
      const dayName = currentDate.format('dddd'); // Monday, Tuesday, etc.
      const isWeekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayName);
      
      if (isWeekday) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        console.log(`\n📆 Processing ${dateStr} (${dayName})...`);

        // Get all duties for this day
        const dutiesForDay = await Duty.find({ day: dayName, status: "Active" });
        
        for (const duty of dutiesForDay) {
          // Find student from database (in case they weren't created in this run)
          const student = await Scholar.findOne({ id: duty.id });
          if (!student) {
            console.log(`   ⚠️  Student with ID ${duty.id} not found, skipping duty`);
            continue;
          }

          // Determine if present or absent (70% present rate)
          const isPresent = Math.random() < 0.7;
          const status = isPresent ? 'Present' : 'Absent';

          // Generate check-in time (duty.time is a single time like "8:00 AM")
          // Schedule is 1.5 hours (90 minutes), so end time is start time + 90 minutes
          const checkInTime = moment(`${dateStr} ${duty.time}`, 'YYYY-MM-DD h:mm A');
          const checkOutTime = isPresent ? checkInTime.clone().add(90, 'minutes') : null;

          // Create regular Attendance record
          // Format encodedTime as string (YYYY-MM-DD HH:mm:ss format)
          const encodedTimeStr = checkInTime.format('YYYY-MM-DD HH:mm:ss');
          
          const attendance = new Attendance({
            studentName: student.name,
            studentId: student.id,
            yearLevel: student.year,
            course: student.course,
            dutyType: duty.dutyType,
            room: duty.room,
            classStatus: status,
            facilitatorStatus: status,
            encodedTime: encodedTimeStr,
            checkerId: 'CHECKER001',
            checkerName: 'Checker User',
          });
          await attendance.save();
          createdAttendances.push(attendance);

          // Create FaciAttendance or CheckerAttendance based on duty type
          // Even absent students need a checkInTime (it's required), but status will be "Absent"
          if (duty.dutyType === "Student Facilitator") {
            const faciAttendance = new FaciAttendance({
              studentId: student.id,
              studentName: student.name,
              checkInTime: checkInTime.toDate(), // Always set checkInTime (required field)
              scheduleDate: checkInTime.toDate(),
              location: duty.room,
              status: status, // "Present" or "Absent"
              verifiedAt: isPresent ? checkInTime.clone().add(30, 'minutes').toDate() : null,
            });
            await faciAttendance.save();
            createdFaciAttendances.push(faciAttendance);
          } else if (duty.dutyType === "Attendance Checker") {
            const checkerAttendance = new CheckerAttendance({
              studentId: student.id,
              studentName: student.name,
              checkInTime: checkInTime.toDate(), // Always set checkInTime (required field)
              location: duty.room === "N/A" ? "Main Office" : duty.room,
              status: status, // "Present" or "Absent"
              verifiedAt: isPresent ? checkInTime.clone().add(30, 'minutes').toDate() : null,
            });
            await checkerAttendance.save();
            createdCheckerAttendances.push(checkerAttendance);
          }
        }
        console.log(`   ✅ Created attendance records for ${dutiesForDay.length} duties`);
      }
      
      currentDate.add(1, 'day');
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ DATA GENERATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`📚 Students created: ${createdStudents.length}`);
    console.log(`👥 Users created: ${createdUsers.length}`);
    console.log(`📋 Duties created: ${createdDuties.length}`);
    console.log(`📊 Attendance records created: ${createdAttendances.length}`);
    console.log(`👨‍🏫 Facilitator attendance records: ${createdFaciAttendances.length}`);
    console.log(`✅ Checker attendance records: ${createdCheckerAttendances.length}`);
    console.log("\n🔑 Login credentials:");
    console.log("   All users have password: Password@123");
    console.log("   Emails: <firstname>.<lastname><number>@phinmaed.com");
    console.log("\n" + "=".repeat(60));

    mongoose.connection.close();
    console.log("🚪 Connection closed. Done!");
  } catch (err) {
    console.error("❌ Error generating test data:", err);
    mongoose.connection.close();
  }
}

generateTestData();

