import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { LineChart } from 'react-native-chart-kit';

const API_BASE_URL = 'http://192.168.1.9:8000';
const SCREEN_WIDTH = Dimensions.get('window').width;

const SFDashboard = () => {
  const [stats, setStats] = useState([]);
  const [upcomingDuties, setUpcomingDuties] = useState([]);
  const [absentList, setAbsentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [weeklyTrend, setWeeklyTrend] = useState([]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2563EB',
    },
  };

  const chartWidth = Math.min(SCREEN_WIDTH - 48, 600);

  /* ────────────────────── Helper Functions ────────────────────── */
  const parseDutyTime = (timeStr, date) => {
    const [start, end] = timeStr.split('-').map((t) => t.trim());
    const startTime = moment(`${date} ${start}`, 'YYYY-MM-DD h:mmA');
    const endTime = moment(`${date} ${end}`, 'YYYY-MM-DD h:mmA');
    if (!startTime.isValid() || !endTime.isValid())
      return { startTime: null, endTime: null };
    return { startTime, endTime };
  };

  const calculateHours = (start, end) => {
    if (!moment(start).isValid() || !moment(end).isValid()) return 0;
    return moment(end).diff(moment(start), 'hours', true);
  };

  const getRemainingShift = (startTime, endTime, currentTime) => {
    if (!moment(startTime).isValid() || !moment(endTime).isValid())
      return 'Invalid Shift';
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
  /* ────────────────────────────────────────────────────────────── */

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
        } catch {
          throw new Error('Invalid token format or decoding issue.');
        }
        if (!studentId) throw new Error('No student ID in token. Please log in.');

        const username = await AsyncStorage.getItem('username');

        const dutiesUrl = `${API_BASE_URL}/api/duties?id=${encodeURIComponent(username)}`;
        const attendanceUrl = `${API_BASE_URL}/api/attendance?studentId=${encodeURIComponent(username)}`;
        const checkerAttendanceUrl = `${API_BASE_URL}/api/faci-attendance?studentId=${encodeURIComponent(username)}`;

        const [
          dutiesResponse,
          attendanceResponse,
          checkerAttendanceResponse,
        ] = await Promise.all([
          fetch(dutiesUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(attendanceUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(checkerAttendanceUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (
          !dutiesResponse.ok ||
          !attendanceResponse.ok ||
          !checkerAttendanceResponse.ok
        )
          throw new Error('API fetch error.');

        const allDuties = await dutiesResponse.json();
        const allAttendance = await attendanceResponse.json();
        const allCheckerAttendance = await checkerAttendanceResponse.json();

        const duties = allDuties.filter((d) => d.id === username);
        const checkerAttendance = allCheckerAttendance.filter(
          (att) => att.studentId === username
        );

        const today = moment().format('YYYY-MM-DD');
        const todayDayName = moment().format('dddd');
        const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');

        /* ────────────────────── Current Shift ────────────────────── */
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

        /* ────────────────────── Hours & Progress ────────────────────── */
        const semesterGoal = 70;
        let totalHours = 0;
        let weekHours = 0;

        // 1. Normal completed duties
        checkerAttendance.forEach((att) => {
          const attMoment = moment(att.checkInTime);
          const attDay = attMoment.format('dddd');
          const duty = duties.find(
            (d) =>
              d.id === username &&
              d.room === att.location &&
              d.day === attDay &&
              d.status === 'Active'
          );
          if (duty) {
            const dutyDate = attMoment.format('YYYY-MM-DD');
            const { startTime, endTime } = parseDutyTime(duty.time, dutyDate);
            if (startTime && endTime && attMoment.isAfter(endTime)) {
              const hrs = calculateHours(startTime, endTime);
              totalHours += hrs;
              if (moment(dutyDate).isBetween(startOfWeek, endOfWeek, null, '[]')) {
                weekHours += hrs;
              }
            }
          }
        });

        // 2. Present → +1.5h
        const presentRecord = checkerAttendance.find(
          (att) => att.studentId === username && att.status === 'Present'
        );

        if (presentRecord) {
          const extraHours = 1.5;
          totalHours += extraHours;
          const attDate = moment(presentRecord.checkInTime).format('YYYY-MM-DD');
          if (moment(attDate).isBetween(startOfWeek, endOfWeek, null, '[]')) {
            weekHours += extraHours;
          }
        }

        const progressPercentage = Math.min((totalHours / semesterGoal) * 100, 100);

        /* ────────────────────── SYNC & FETCH ABSENCES ────────────────────── */
        const saveCalculatedAbsences = async () => {
          try {
            const todayStr = moment().format('YYYY-MM-DD');
            
            // Find earliest duty createdAt date
            const dutyDates = duties.map(d => moment(d.createdAt || d.date || new Date()));
            const earliestDutyDate = dutyDates.length > 0 
              ? moment.min(dutyDates).format('YYYY-MM-DD')
              : moment().subtract(90, 'days').format('YYYY-MM-DD'); // Fallback to 90 days
            
            // Get all dates where there are attendance records
            const attendanceDates = new Set(
              checkerAttendance.map((att) => {
                const dateStr = moment(att.scheduleDate || att.checkInTime).format('YYYY-MM-DD');
                return dateStr;
              })
            );
            
            // Generate all dates from earliest duty date to today
            const historicalDates = new Set();
            let currentDate = moment(earliestDutyDate);
            const today = moment();
            
            while (currentDate.isSameOrBefore(today, 'day')) {
              const dateStr = currentDate.format('YYYY-MM-DD');
              const dayName = currentDate.format('dddd');
              
              // Check if there's an active duty for this day
              const hasDuty = duties.some(d => d.day === dayName && d.status === 'Active');
              if (hasDuty || attendanceDates.has(dateStr)) {
                historicalDates.add(dateStr);
              }
              
              currentDate.add(1, 'day');
            }

            const calculated = [];
            const absentAttendanceRecords = [];

            for (const dateStr of historicalDates) {
              const isToday = dateStr === todayStr;
              const dayName = moment(dateStr).format('dddd');
              const dateActiveDuties = duties.filter(
                (d) => d.day === dayName && d.status === 'Active'
              );

              for (const duty of dateActiveDuties) {
                const { startTime, endTime } = parseDutyTime(duty.time, dateStr);
                if (!startTime || !endTime) continue;
                if (isToday && moment().isBefore(endTime)) continue;

                // Check for attendance by scheduleDate (new logic)
                const scheduleDate = moment(dateStr).startOf('day').toDate();
                const hasAttendanceBySchedule = checkerAttendance.some((att) => {
                  const attScheduleDate = att.scheduleDate 
                    ? moment(att.scheduleDate).format('YYYY-MM-DD')
                    : moment(att.checkInTime).format('YYYY-MM-DD');
                  
                  // Self-attendance: if photo was taken within scheduleDate, mark as Present
                  if (att.photoId && att.checkInTime) {
                    const photoDate = moment(att.checkInTime).format('YYYY-MM-DD');
                    if (photoDate === dateStr && att.location === duty.room) {
                      // Photo timestamp is within scheduleDate, this is valid self-attendance
                      return true;
                    }
                  }
                  
                  return attScheduleDate === dateStr && att.location === duty.room;
                });

                // Also check for completed duty (old logic)
                const hasCompleted = checkerAttendance.some((att) => {
                  const checkIn = moment(att.checkInTime || att.scheduleDate);
                  const checkOut = att.checkOutTime ? moment(att.checkOutTime) : null;
                  return (
                    checkIn.format('YYYY-MM-DD') === dateStr &&
                    att.location === duty.room &&
                    checkOut && checkOut.isAfter(endTime)
                  );
                });

                // If no attendance record exists for this scheduleDate, mark as absent
                if (!hasAttendanceBySchedule) {
                  calculated.push({
                    studentId: username,
                    date: scheduleDate,
                    room: duty.room,
                    time: duty.time,
                  });

                  // Also create an Absent record in faci-attendance
                  absentAttendanceRecords.push({
                    studentId: username,
                    studentName: checkerAttendance[0]?.studentName || username,
                    scheduleDate: scheduleDate,
                    location: duty.room,
                    status: 'Absent',
                    checkInTime: scheduleDate,
                  });
                } else if (!hasCompleted) {
                  // Had attendance but didn't complete (old logic)
                  calculated.push({
                    studentId: username,
                    date: scheduleDate,
                    room: duty.room,
                    time: duty.time,
                  });
                }
              }
            }

            // Save to /api/absent endpoint
            if (calculated.length > 0) {
              console.log('Sending absences to backend:', calculated);

              const response = await fetch(`${API_BASE_URL}/api/absent`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(calculated),
              });

              const result = await response.json();
              console.log('Backend response:', result);

              if (!response.ok) {
                console.error('Failed to save absences:', result);
                throw new Error(`HTTP ${response.status}`);
              }

              console.log(`Saved ${calculated.length} absence(s)`);
            } else {
              console.log('No absences to save');
            }

            // Save Absent records to faci-attendance with status="Absent"
            if (absentAttendanceRecords.length > 0) {
              console.log('Creating Absent records in faci-attendance:', absentAttendanceRecords.length);
              
              for (const absentRecord of absentAttendanceRecords) {
                try {
                  // Check if record already exists
                  const scheduleDateStr = moment(absentRecord.scheduleDate).format('YYYY-MM-DD');
                  const existingCheck = await fetch(
                    `${API_BASE_URL}/api/faci-attendance?studentId=${encodeURIComponent(username)}&startDate=${scheduleDateStr}&endDate=${scheduleDateStr}`
                  );
                  
                  if (existingCheck.ok) {
                    const existing = await existingCheck.json();
                    const hasExistingForSchedule = existing.some(att => {
                      const attDate = att.scheduleDate 
                        ? moment(att.scheduleDate).format('YYYY-MM-DD')
                        : moment(att.checkInTime).format('YYYY-MM-DD');
                      return attDate === scheduleDateStr && att.location === absentRecord.location;
                    });

                    // Only create if it doesn't exist
                    if (!hasExistingForSchedule) {
                      const absentResponse = await fetch(`${API_BASE_URL}/api/faci-attendance`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(absentRecord),
                      });

                      if (absentResponse.ok) {
                        console.log(`Created Absent record for ${scheduleDateStr}`);
                      }
                    }
                  }
                } catch (err) {
                  console.warn('Failed to create Absent record:', err);
                }
              }
            }
          } catch (err) {
            console.error('saveCalculatedAbsences error:', err);
          }
        };

        const fetchAbsencesFromBackend = async () => {
          try {
            console.log('Fetching absences for:', username);
            const res = await fetch(
              `${API_BASE_URL}/api/absent/list?studentId=${username}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            const data = await res.json();
            console.log('Fetched absences:', data);

            if (res.ok) {
              setAbsentList(data.map(a => ({
                date: a.date,
                room: a.room,
                time: a.time,
              })));
              return data.length;
            } else {
              console.error('Fetch failed:', data);
            }
          } catch (err) {
            console.warn('Failed to fetch absences:', err);
          }
          return 0;
        };

        // Sync + fetch
        await saveCalculatedAbsences();
        const absentCount = await fetchAbsencesFromBackend();

        let todaysAttendanceRecord = null;
        let weeklyTrendData = [];

        try {
          const todayIso = moment().format('YYYY-MM-DD');
          const [todayAttendanceRes, weeklyTrendRes] = await Promise.all([
            fetch(
              `${API_BASE_URL}/api/faci-attendance?studentId=${encodeURIComponent(
                username
              )}&startDate=${todayIso}&endDate=${todayIso}`
            ),
            fetch(
              `${API_BASE_URL}/api/faci-attendance/summary/weekly-trend?studentId=${encodeURIComponent(
                username
              )}&days=7`
            ),
          ]);

          if (todayAttendanceRes.ok) {
            const records = await todayAttendanceRes.json();
            if (Array.isArray(records) && records.length > 0) {
              const sorted = [...records].sort(
                (a, b) =>
                  new Date(b.checkInTime || b.scheduleDate || 0) -
                  new Date(a.checkInTime || a.scheduleDate || 0)
              );
              todaysAttendanceRecord =
                sorted.find((entry) => entry.status === 'Present') || sorted[0];
            }
          }

          if (weeklyTrendRes.ok) {
            const trend = await weeklyTrendRes.json();
            if (Array.isArray(trend)) {
              weeklyTrendData = trend;
            }
          }
        } catch (trendError) {
          console.warn('SFDashboard trend fetch failed:', trendError.message);
        }

        /* ────────────────────── UPCOMING DUTIES ────────────────────── */
        const now = moment();
        const upcoming = [];

        for (let i = 0; i < 30; i++) {
          const date = moment().add(i, 'days');
          const dayName = date.format('dddd');
          const dateStr = date.format('YYYY-MM-DD');
          const dateLabel = date.format('ddd MMM D YYYY');

          const dayDuties = duties
            .filter((d) => d.day === dayName && d.status === 'Active')
            .map((d) => ({
              date: dateLabel,
              time: d.time,
              room: d.room,
            }));

          dayDuties.forEach((d) => {
            const { endTime } = parseDutyTime(d.time, dateStr);
            if (endTime && moment(endTime).isAfter(now)) {
              upcoming.push(d);
            }
          });
        }

        /* ────────────────────── Set State ────────────────────── */
        if (isMounted) {
          setStats([
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
              subtitle: absentCount === 0 ? 'None missed' : 'Total record',
              icon: 'alert-circle-outline',
              color: '#EF4444',
            },
          ]);

          setUpcomingDuties(upcoming);
          setTodayAttendance(todaysAttendanceRecord);
          setWeeklyTrend(weeklyTrendData);
        }
      } catch (err) {
        if (isMounted) setError(`Failed to load dashboard data: ${err.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => (isMounted = false);
  }, []);

  /* ────────────────────── UI ────────────────────── */
  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );

  if (error)
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {stats.map((stat, idx) => (
          <View key={idx} style={styles.card}>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s Attendance</Text>
        <View style={styles.box}>
          {todayAttendance ? (
            <View style={styles.todayAttendanceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDate}>
                  {moment(todayAttendance.scheduleDate || todayAttendance.checkInTime).format('ddd, MMM D YYYY')}
                </Text>
                <Text
                  style={[
                    styles.itemDetail,
                    todayAttendance.status === 'Present' ? styles.statusPresent : styles.statusAbsent,
                  ]}
                >
                  Status: {todayAttendance.status || 'Pending'}
                </Text>
                <Text style={styles.itemDetail}>
                  Checked in:{' '}
                  {todayAttendance.checkInTime
                    ? moment(todayAttendance.checkInTime).format('h:mm A')
                    : '—'}
                </Text>
                <Text style={styles.itemDetail}>
                  Location: {todayAttendance.location || 'N/A'}
                </Text>
              </View>
              {todayAttendance.photoUrl ? (
                <Image source={{ uri: todayAttendance.photoUrl }} style={styles.todayPhoto} />
              ) : (
                <View style={[styles.todayPhoto, styles.photoPlaceholder]}>
                  <Text style={styles.photoPlaceholderText}>No Photo</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No attendance recorded yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Attendance Trend</Text>
        <View style={styles.box}>
          {weeklyTrend.length > 0 ? (
            <LineChart
              data={{
                labels: weeklyTrend.map((item) => moment(item.date).format('ddd')),
                datasets: [
                  {
                    data: weeklyTrend.map((item) => item.rate ?? 0),
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={Math.max(chartWidth, weeklyTrend.length * 60)}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
            />
          ) : (
            <Text style={styles.emptyText}>No trend data yet.</Text>
          )}
        </View>
      </View>

      {/* Upcoming Duties */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Duties</Text>
        <View style={styles.box}>
          {upcomingDuties.length > 0 ? (
            upcomingDuties.map((item, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemDate}>{item.date}</Text>
                <Text style={styles.itemDetail}>
                  {item.room} – {item.time}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No upcoming duties</Text>
          )}
        </View>
      </View>

      {/* All Absences List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Absences</Text>
        <View style={styles.box}>
          {absentList.length > 0 ? (
            absentList.map((miss, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemDate}>{miss.date}</Text>
                <Text style={styles.itemDetail}>
                  {miss.room} – {miss.time}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No absences recorded</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

/* ────────────────────── Styles ────────────────────── */
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: '#F8FAFC' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: { alignSelf: 'center', marginBottom: 8 },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#475569',
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1E293B',
    textAlign: 'center',
  },
  cardSubtitle: { color: '#64748B', fontSize: 11, textAlign: 'center' },
  progressContainer: { marginTop: 8 },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  todayAttendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  todayPhoto: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: '#64748B',
    fontSize: 12,
  },

  section: { marginTop: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1E293B',
  },
  box: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  item: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemDate: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 2,
  },
  itemDetail: { fontSize: 13, color: '#64748B' },
  statusPresent: { color: '#10B981' },
  statusAbsent: { color: '#EF4444' },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  chartStyle: { marginTop: 8, borderRadius: 12 },
});

export default SFDashboard;