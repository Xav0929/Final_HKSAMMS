import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

const ACDashboard = () => {
  const [stats, setStats] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper functions
  const parseDutyTime = (timeStr, date) => {
    const [start, end] = timeStr.split('-').map((t) => t.trim());
    const startTime = moment(`${date} ${start}`, 'YYYY-MM-DD h:mmA');
    const endTime = moment(`${date} ${end}`, 'YYYY-MM-DD h:mmA');
    if (!startTime.isValid() || !endTime.isValid()) {
      console.error(`Invalid time format: ${timeStr} for date ${date}`);
      return { startTime: null, endTime: null };
    }
    return { startTime, endTime };
  };

  const calculateHours = (start, end) => {
    if (!moment(start).isValid() || !moment(end).isValid()) return 0;
    return moment(end).diff(moment(start), 'hours', true);
  };

  const getRemainingShift = (startTime, endTime, currentTime) => {
    if (!moment(startTime).isValid() || !moment(endTime).isValid()) return 'Invalid Shift';
    const now = moment(currentTime);
    const end = moment(endTime);
    if (now.isBefore(end)) {
      const remainingMinutes = end.diff(now, 'minutes');
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      return `${hours}hr ${minutes}m`;
    }
    return 'Shift Ended';
  };

  // Fetch data and compute stats
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('No authentication token found. Please log in.');

        let studentId;
        try {
          const decoded = jwtDecode(token);
          studentId = decoded?._id;
        } catch (decodeError) {
          throw new Error('Invalid token format or decoding issue. Please log in again.');
        }

        if (!studentId) throw new Error('No student ID in token. Please log in.');

        setLoading(true);
        setError(null);

        const username = await AsyncStorage.getItem('username');

        const dutiesUrl = ` https://final-hksamms.onrender.com/api/duties?id=${encodeURIComponent(username)}`;
        const attendanceUrl = ` https://final-hksamms.onrender.com/api/attendance?studentId=${encodeURIComponent(username)}`;
        const checkerAttendanceUrl = ` https://final-hksamms.onrender.com/api/checkerAttendance?studentId=${encodeURIComponent(username)}`;

        const [dutiesResponse, attendanceResponse, checkerAttendanceResponse] = await Promise.all([
          fetch(dutiesUrl),
          fetch(attendanceUrl),
          fetch(checkerAttendanceUrl),
        ]);

        if (!dutiesResponse.ok) throw new Error(`Duties API error: ${dutiesResponse.status}`);
        if (!attendanceResponse.ok) throw new Error(`Attendance API error: ${attendanceResponse.status}`);
        if (!checkerAttendanceResponse.ok) throw new Error(`CheckerAttendance API error: ${checkerAttendanceResponse.status}`);

        const allDuties = await dutiesResponse.json();
        const allAttendance = await attendanceResponse.json();
        const allCheckerAttendance = await checkerAttendanceResponse.json();

        const duties = allDuties.filter((duty) => duty.id === username);
        const attendance = allAttendance.filter((att) => att.studentId === username);
        const checkerAttendance = allCheckerAttendance.filter((att) => att.studentId === username);

        const today = moment().format('YYYY-MM-DD');
        const todayDayName = moment().format('dddd');
        const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');

        const todaySchedule = duties
          .filter((duty) => duty.day === todayDayName && duty.status === 'Active')
          .map((duty) => ({
            date: moment(today).format('ddd MMM D YYYY'),
            time: duty.time,
          }));

        const todayChecks = attendance.filter((att) =>
          moment(att.encodedTime, 'MM/DD/YYYY hh:mm A').isSame(today, 'day')
        ).length;

        let currentShift = 'No Active Shift';
        const currentTime = moment();
        const activeDuty = duties.find((duty) => {
          if (duty.day !== todayDayName || duty.status !== 'Active') return false;
          const { startTime, endTime } = parseDutyTime(duty.time, today);
          return currentTime.isBetween(startTime, endTime, null, '[]');
        });
        if (activeDuty) {
          const { endTime } = parseDutyTime(activeDuty.time, today);
          currentShift = getRemainingShift(currentTime, endTime, currentTime);
        }

        const semesterGoal = 70;
        const totalHours = checkerAttendance.reduce((total, att) => {
          const attMoment = moment(att.checkInTime);
          const attDay = attMoment.format('dddd');
          const duty = duties.find(
            (d) => d.id === username && d.room === att.location && d.day === attDay && d.status === 'Active'
          );
          if (duty) {
            const dutyDate = attMoment.format('YYYY-MM-DD');
            const { startTime, endTime } = parseDutyTime(duty.time, dutyDate);
            if (startTime && endTime && attMoment.isAfter(endTime)) {
              const hours = calculateHours(startTime, endTime);
              return total + hours;
            }
          }
          return total;
        }, 0);
        const progressPercentage = Math.min((totalHours / semesterGoal) * 100, 100);

        const weekHours = checkerAttendance.reduce((total, att) => {
          const attMoment = moment(att.checkInTime);
          if (!attMoment.isBetween(startOfWeek, endOfWeek, null, '[]')) return total;
          const attDay = attMoment.format('dddd');
          const duty = duties.find(
            (d) => d.id === username && d.room === att.location && d.day === attDay && d.status === 'Active'
          );
          if (duty) {
            const dutyDate = attMoment.format('YYYY-MM-DD');
            const { startTime, endTime } = parseDutyTime(duty.time, dutyDate);
            if (startTime && endTime && attMoment.isAfter(endTime)) {
              const hours = calculateHours(startTime, endTime);
              return total + hours;
            }
          }
          return total;
        }, 0);

        // ———————————————————————————————————————
        // ALL-TIME + TODAY ABSENCES COUNTER
        // ———————————————————————————————————————
        const todayStr = moment().format('YYYY-MM-DD');

        // Include TODAY even if no check-in
        const historicalDates = [...new Set(checkerAttendance.map(att => moment(att.checkInTime).format('YYYY-MM-DD')))];
        if (!historicalDates.includes(todayStr)) {
          historicalDates.push(todayStr);
        }

        let absentCount = 0;

        historicalDates.forEach(dateStr => {
          const isToday = dateStr === todayStr;
          const dayName = moment(dateStr).format('dddd');
          const dateActiveDuties = duties.filter(d => d.day === dayName && d.status === 'Active');

          dateActiveDuties.forEach(duty => {
            const { startTime, endTime } = parseDutyTime(duty.time, dateStr);
            if (!startTime || !endTime) return;

            // Skip if today and shift hasn't ended
            if (isToday && moment().isBefore(endTime)) {
              return;
            }

            // Check for completed checkout
            const hasCompleted = checkerAttendance.some(att => {
              const checkIn = moment(att.checkInTime);
              const checkOut = att.checkOutTime ? moment(att.checkOutTime) : null;
              return (
                checkIn.format('YYYY-MM-DD') === dateStr &&
                att.location === duty.room &&
                checkOut && checkOut.isAfter(endTime)
              );
            });

            if (!hasCompleted) {
              absentCount++;
            }
          });
        });

        // ———————————————————————————————————————
        // Set Stats (with Absences)
        // ———————————————————————————————————————
        if (isMounted) {
          setStats([
            {
              title: "Today's Checks",
              value: todayChecks.toString(),
              subtitle: 'student faci encoded',
              icon: 'checkmark-circle-outline',
              color: '#10B981',
            },
            {
              title: 'Current Shift',
              value: currentShift,
              subtitle: 'Remaining',
              icon: 'time-outline',
              color: '#F59E0B',
            },
            {
              title: 'This Week',
              value: `${weekHours.toFixed(1)} Hours`,
              subtitle: 'Completed',
              icon: 'calendar-outline',
              color: '#3B82F6',
            },
            {
              title: 'Progress Hours',
              value: `${totalHours.toFixed(1)}/${semesterGoal} hrs`,
              subtitle: `${progressPercentage.toFixed(0)}% to semester goal`,
              icon: 'trending-up-outline',
              color: '#8B5CF6',
              progress: progressPercentage,
            },
            {
              title: 'Absences',
              value: absentCount === 0 ? '–' : absentCount,
              subtitle: absentCount === 0 ? 'None missed' : 'All time',
              icon: 'alert-circle-outline',
              color: '#EF4444',
            },
          ]);

          setSchedule(todaySchedule);
        }
      } catch (error) {
        if (isMounted) setError(`Failed to load dashboard data: ${error.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statsRow}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name={stat.icon} size={28} color={stat.color} />
            </View>
            <Text style={styles.cardTitle}>{stat.title}</Text>
            <Text style={styles.cardValue}>{stat.value}</Text>
            <Text style={styles.cardSubtitle}>{stat.subtitle}</Text>
            {stat.progress !== undefined && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${stat.progress}%`, backgroundColor: stat.color },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleTitle}>Today's Schedule</Text>
        <View style={styles.scheduleBox}>
          {schedule.length > 0 ? (
            schedule.map((item, index) => (
              <View key={index} style={styles.scheduleItem}>
                <Text style={styles.scheduleDate}>{item.date}</Text>
                <Text style={styles.scheduleTime}>{item.time}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.scheduleTime}>No schedule for today</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' },
  card: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, width: '48%', marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  iconContainer: { alignSelf: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '500', marginBottom: 4, color: '#475569', textAlign: 'center', lineHeight: 18 },
  cardValue: { fontSize: 20, fontWeight: '700', marginBottom: 4, color: '#1E293B', textAlign: 'center' },
  cardSubtitle: { color: '#64748B', fontSize: 11, textAlign: 'center', lineHeight: 14 },
  progressContainer: { marginTop: 8 },
  progressBar: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scheduleSection: { marginTop: 8 },
  scheduleTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1E293B' },
  scheduleBox: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2,
  },
  scheduleItem: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  scheduleDate: { fontWeight: '600', fontSize: 14, color: '#1E293B', marginBottom: 2 },
  scheduleTime: { fontSize: 13, color: '#64748B' },
});

export default ACDashboard;