import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import moment from 'moment';

const { width } = Dimensions.get('window');

const useContainerWidth = () => {
  const [containerWidth, setContainerWidth] = useState(width);
  const onLayout = useCallback((event) => {
    const newWidth = event.nativeEvent.layout.width;
    setContainerWidth(newWidth);
  }, []);
  return [containerWidth, onLayout];
};

/* ──────────────────────────────────────────────────────────────
   StatsCard
   ────────────────────────────────────────────────────────────── */
const StatsCard = ({ title, value, detail, detailColor, iconName }) => (
  <View style={styles.card}>
    <Ionicons name={iconName} size={28} color="#60a5fa" style={styles.cardIcon} />
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardValue}>{value}</Text>
    <Text style={[styles.cardDetail, { color: detailColor }]}>{detail}</Text>
  </View>
);

/* ──────────────────────────────────────────────────────────────
   Predictive Year-Level Analysis Card
   ────────────────────────────────────────────────────────────── */
const PredictiveYearLevelAnalysis = () => {
  const yearLevelData = [
    { year: '1st Year', current: 87.5, predicted: 89.2, trend: 'increasing', trendColor: '#3b82f6' },
    { year: '2nd Year', current: 92.3, predicted: 92.8, trend: 'stable', trendColor: '#6b7280' },
    { year: '3rd Year', current: 88.7, predicted: 90.1, trend: 'increasing', trendColor: '#3b82f6' },
    { year: '4th Year', current: 85.2, predicted: 84.3, trend: 'decreasing', trendColor: '#ef4444' },
  ];

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return 'trending-up-outline';
      case 'decreasing': return 'trending-down-outline';
      case 'stable': return 'arrow-forward-outline';
      default: return 'remove-outline';
    }
  };

  return (
    <View style={styles.analysisCardTall}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          <Ionicons name="analytics-outline" size={18} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.analysisCardTitleBig}>Predictive Year-Level Analysis</Text>
          <Text style={styles.analysisCardSubtitle}>Attendance trends and future projections by academic year</Text>
        </View>
      </View>

      {yearLevelData.map((item, index) => (
        <View key={index} style={styles.yearLevelRow}>
          <View style={styles.yearLevelIconContainer}>
            <Ionicons name={getTrendIcon(item.trend)} size={18} color={item.trendColor} />
          </View>

          <View style={styles.yearLevelContent}>
            <Text style={styles.yearLevelLabel}>{item.year}</Text>
            <Text style={styles.yearLevelText}>
              Current: {item.current}% to Predicted: {item.predicted}%
            </Text>
          </View>

          <View style={styles.barChartContainer}>
            <View
              style={[
                styles.barChartBar,
                {
                  width: `${Math.max(item.current, item.predicted) * 0.75}%`,
                  backgroundColor: item.trendColor,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor:
                  item.trend === 'stable' ? '#f3f4f6' :
                  item.trend === 'increasing' ? '#dbeafe' : '#fee2e2',
              },
            ]}
          >
            <Text style={[styles.trendText, { color: item.trendColor }]}>
              {item.trend.charAt(0).toUpperCase() + item.trend.slice(1)}
            </Text>
          </View>
        </View>
      ))}

      <View style={styles.keyInsightBox}>
        <Text style={styles.keyInsightLabel}>Key Insight</Text>
        <View style={styles.insightWrapper}>
          <Text style={styles.keyInsightText}>
            2nd Year students show the highest and most stable attendance rate (92.3%), 
            making them the most consistently active cohort. 1st and 3rd Year students are 
            showing positive growth trends, while 4th Year attendance requires attention 
            with a declining trajectory.
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ──────────────────────────────────────────────────────────────
   Top 5 Performing Departments Card
   ────────────────────────────────────────────────────────────── */
const TopPerformingDepartments = () => {
  const departments = [
    { rank: 1, name: 'Computer Science', consistency: 'high consistency', percentage: 94.2, consistencyColor: '#10b981' },
    { rank: 2, name: 'Engineering', consistency: 'high consistency', percentage: 91.8, consistencyColor: '#10b981' },
    { rank: 3, name: 'Business Administration', consistency: 'medium consistency', percentage: 89.5, consistencyColor: '#6b7280' },
    { rank: 4, name: 'Nursing', consistency: 'high consistency', percentage: 88.3, consistencyColor: '#10b981' },
    { rank: 5, name: 'Education', consistency: 'medium consistency', percentage: 86.9, consistencyColor: '#6b7280' },
  ];

  return (
    <View style={styles.analysisCardTall}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          <Ionicons name="people-outline" size={18} color="#10b981" />
        </View>
        <View>
          <Text style={styles.analysisCardTitleBig}>Top 5 Performing Departments</Text>
          <Text style={styles.analysisCardSubtitle}>Departments with highest attendance consistency</Text>
        </View>
      </View>

      {departments.map((dept) => (
        <View key={dept.rank} style={styles.departmentRow}>
          <View style={[styles.rankBadge, dept.rank === 1 && styles.rankBadgeFirst]}>
            <Text style={[styles.rankText, dept.rank === 1 && styles.rankTextFirst]}>{dept.rank}</Text>
          </View>
          <View style={styles.departmentContent}>
            <Text style={styles.departmentName}>{dept.name}</Text>
            <View
              style={[
                styles.consistencyBadge,
                { backgroundColor: dept.consistencyColor === '#10b981' ? '#d1fae5' : '#f3f4f6' },
              ]}
            >
              <Text style={[styles.consistencyText, { color: dept.consistencyColor }]}>{dept.consistency}</Text>
            </View>
          </View>
          <View style={styles.barChartContainer}>
            <View style={[styles.barChartBar, { width: `${dept.percentage * 0.75}%`, backgroundColor: '#10b981' }]} />
          </View>
          <Text style={styles.percentageText}>{dept.percentage}%</Text>
        </View>
      ))}

      <View style={styles.summaryBox}>
        <Text style={styles.keyInsightLabel}>Key Insight</Text>
        <View style={styles.insightWrapper}>
          <Text style={styles.summaryText}>
            Department Excellence: Computer Science leads with 94.2% attendance and high consistency, 
            followed closely by Engineering (91.8%). These top 5 departments demonstrate strong student 
            engagement and should serve as benchmarks for improvement strategies in other departments.
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ──────────────────────────────────────────────────────────────
   GraphPlaceholder, FilterButton, DatePickerModal
   ────────────────────────────────────────────────────────────── */
const GraphPlaceholder = ({ title, height = 200, children, filterMenu = null }) => {
  const [containerWidth, onLayout] = useContainerWidth();
  const innerChartWidth = containerWidth - 32;

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type?.name?.includes('Chart')) {
      return React.cloneElement(child, { width: innerChartWidth });
    }
    return child;
  });

  return (
    <View style={styles.graphContainer} onLayout={onLayout}>
      <Text style={styles.graphTitle}>{title}</Text>
      {filterMenu}
      <View style={[styles.graphBox, { height }]}>
        {childrenWithProps}
      </View>
    </View>
  );
};

const FilterButton = ({ label, isSelected, onPress, color, bgColor }) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      {
        backgroundColor: isSelected ? (bgColor || '#1d4ed8') : '#f3f4f6',
        borderColor: isSelected ? (color || '#1d4ed8') : '#d1d5db',
      },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.filterButtonText,
        {
          color: isSelected ? '#161616ff' : (color || '#1f2937'),
          fontWeight: isSelected ? 'bold' : 'normal',
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const DatePickerModal = ({ isVisible, onClose, onSelectDate, initialYear, initialMonthIndex }) => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 10 }, (_, i) => currentYear + 3 - i).sort((a, b) => b - a);

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(initialMonthIndex);

  const handleSelect = (year, monthIndex) => {
    onSelectDate(year, MONTHS[monthIndex]);
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <Pressable style={styles.centeredView} onPress={onClose}>
        <Pressable style={styles.modalView} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={styles.closeButton} onPress={() => onClose()}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={styles.modalHeader}>Select Year</Text>
          <View style={styles.yearRow}>
            {YEARS.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.yearButton, selectedYear === year && styles.yearButtonSelected]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[styles.dateText, selectedYear === year && styles.dateTextSelected]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalHeader}>Select Month</Text>
          <View style={styles.monthGrid}>
            {MONTHS.map((month, index) => (
              <TouchableOpacity
                key={month}
                style={[styles.monthButton, selectedMonthIndex === index && styles.monthButtonSelected]}
                onPress={() => {
                  setSelectedMonthIndex(index);
                  handleSelect(selectedYear, index);
                  onClose();
                }}
              >
                <Text style={[styles.dateText, selectedMonthIndex === index && styles.dateTextSelected]}>
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* ──────────────────────────────────────────────────────────────
   MAIN DASHBOARD
   ────────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(width < 768);
  const [totalScholars, setTotalScholars] = useState('...');
  const [scholarGrowth, setScholarGrowth] = useState('...');
  const [absentToday, setAbsentToday] = useState('...');
  const [presentToday, setPresentToday] = useState('...');
  const [weeklyAverage, setWeeklyAverage] = useState('...');
  const [weeklyGrowth, setWeeklyGrowth] = useState('...');

  // Mutable statsData to update "This Week" card
  const [statsData, setStatsData] = useState([
    {
      title: 'Total Scholar',
      value: totalScholars,
      detail: `${scholarGrowth} This Month`,
      detailColor: scholarGrowth.startsWith('+') ? 'green' : scholarGrowth === '—' ? '#6b7280' : 'red',
      iconName: 'school-outline',
    },
    {
      title: 'Present Today',
      value: presentToday,
      detail: presentToday !== '...' && totalScholars !== '...'
        ? `${((parseInt(presentToday) / parseInt(totalScholars)) * 100).toFixed(0)}% Attendance Rate`
        : 'Loading...',
      detailColor: 'green',
      iconName: 'checkmark-circle-outline',
    },
    {
      title: 'Absent Today',
      value: absentToday,
      detail: absentToday !== '...' && totalScholars !== '...'
        ? `${((parseInt(absentToday) / parseInt(totalScholars)) * 100).toFixed(0)}% Absence Rate`
        : 'Loading...',
      detailColor: 'red',
      iconName: 'close-circle-outline',
    },
    {
      title: 'Weekly Average',
      value: weeklyAverage,
      detail: `${weeklyGrowth} From last week`,
      detailColor: weeklyGrowth.startsWith('+') ? 'green' : weeklyGrowth === '...' ? '#6b7280' : 'red',
      iconName: 'trending-up-outline',
    },
    { title: 'Monthly Goal', value: '80%', detail: 'Attendance Target: 90%', detailColor: '#60a5fa', iconName: 'flag-outline' },
    { title: 'This Week', value: '...', detail: 'Total Check-ins', detailColor: 'green', iconName: 'calendar-outline' },
  ]);

  // ──────────────────────────────────────────────────────
  //  FETCH SCHOLARS + GROWTH
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchScholarsAndGrowth = async () => {
      try {
        const response = await fetch('https://final-hksamms.onrender.com/api/scholars');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();

        const currentCount = data.length;
        setTotalScholars(currentCount.toString());

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const currentMonthStart = new Date(currentYear, currentMonth, 1);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
        const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const prevMonthEnd = new Date(currentYear, currentMonth, 0);

        const currentMonthScholars = data.filter(s => {
          const date = new Date(s.createdAt);
          return date >= currentMonthStart && date <= currentMonthEnd;
        }).length;

        const prevMonthScholars = data.filter(s => {
          const date = new Date(s.createdAt);
          return date >= prevMonthStart && date <= prevMonthEnd;
        }).length;

        let growth = '';
        if (prevMonthScholars === 0) {
          growth = currentMonthScholars > 0 ? '+100%' : '0%';
        } else {
          const percent = ((currentMonthScholars - prevMonthScholars) / prevMonthScholars) * 100;
          growth = percent > 0 ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`;
        }

        setScholarGrowth(growth);
      } catch (error) {
        console.error('Error fetching scholars:', error);
        setTotalScholars('—');
        setScholarGrowth('—');
      }
    };

    fetchScholarsAndGrowth();
  }, []);

  // ──────────────────────────────────────────────────────
  //  FETCH TODAY'S PRESENT/ABSENT
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTodayAbsences = async () => {
      try {
        const [dutiesRes, attendanceRes, scholarsRes] = await Promise.all([
          fetch('https://final-hksamms.onrender.com/api/duties'),
          fetch('https://final-hksamms.onrender.com/api/faci-attendance'),
          fetch('https://final-hksamms.onrender.com/api/scholars'),
        ]);

        if (!dutiesRes.ok || !attendanceRes.ok || !scholarsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const duties = await dutiesRes.json();
        const attendances = await attendanceRes.json();
        const scholars = await scholarsRes.json();

        const todayStr = moment().format('YYYY-MM-DD');
        const todayDay = moment().format('dddd');

        const presentScholars = new Set();
        const absentScholars = new Set();

        for (const scholar of scholars) {
          const scholarId = scholar.id || scholar._id?.toString();

          const todayDuties = duties.filter(d =>
            d.id === scholarId &&
            d.day === todayDay &&
            d.status === 'Active'
          );

          if (todayDuties.length === 0) continue;

          const todayCheckins = attendances.filter(att =>
            att.studentId === scholarId &&
            moment(att.checkInTime).format('YYYY-MM-DD') === todayStr
          );

          let hasCompletedAnyDuty = false;
          for (const duty of todayDuties) {
            if (isDutyCompleted(duty, todayStr, todayCheckins)) {
              hasCompletedAnyDuty = true;
              break;
            }
          }

          if (hasCompletedAnyDuty) {
            presentScholars.add(scholarId);
          } else {
            absentScholars.add(scholarId);
          }
        }

        const presentCount = presentScholars.size;
        const absentCount = absentScholars.size;

        setPresentToday(presentCount.toString());
        setAbsentToday(absentCount.toString());
      } catch (err) {
        console.error('Absence calc error:', err);
        setAbsentToday('—');
        setPresentToday('—');
      }
    };

    fetchTodayAbsences();
  }, []);

  // ──────────────────────────────────────────────────────
  //  FETCH WEEKLY AVERAGE
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchWeeklyAverage = async () => {
      try {
        const [dutiesRes, attendanceRes, scholarsRes] = await Promise.all([
          fetch('https://final-hksamms.onrender.com/api/duties'),
          fetch('https://final-hksamms.onrender.com/api/faci-attendance'),
          fetch('https://final-hksamms.onrender.com/api/scholars'),
        ]);

        if (!dutiesRes.ok || !attendanceRes.ok || !scholarsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const duties = await dutiesRes.json();
        const attendances = await attendanceRes.json();
        const scholars = await scholarsRes.json();

        const now = moment();
        const startOfWeek = now.clone().startOf('week');
        const endOfWeek = now.clone().endOf('week');
        const startOfLastWeek = startOfWeek.clone().subtract(7, 'days');
        const endOfLastWeek = endOfWeek.clone().subtract(7, 'days');

        const currentWeek = calculateAttendanceRate(scholars, duties, attendances, startOfWeek, endOfWeek);
        const lastWeek = calculateAttendanceRate(scholars, duties, attendances, startOfLastWeek, endOfLastWeek);

        setWeeklyAverage(`${currentWeek.rate.toFixed(0)}%`);
        const growth = currentWeek.rate - lastWeek.rate;
        setWeeklyGrowth(growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`);
      } catch (err) {
        console.error('Weekly average error:', err);
        setWeeklyAverage('—');
        setWeeklyGrowth('—');
      }
    };

    fetchWeeklyAverage();
  }, []);

  // ──────────────────────────────────────────────────────
  //  FETCH THIS WEEK TOTAL CHECK-INS (BOTH APIs)
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchThisWeekCheckins = async () => {
      try {
        const [faciRes, checkerRes] = await Promise.all([
          fetch('https://final-hksamms.onrender.com/api/faci-attendance'),
          fetch('https://final-hksamms.onrender.com/api/checkerAttendance'),
        ]);

        if (!faciRes.ok || !checkerRes.ok) {
          throw new Error('Failed to fetch attendance data');
        }

        const faciAttendances = await faciRes.json();
        const checkerAttendances = await checkerRes.json();

        const now = moment();
        const startOfWeek = now.clone().startOf('week');
        const endOfWeek = now.clone().endOf('week');

        const countWeekCheckins = (records) =>
          records.filter(att => {
            const checkIn = moment(att.checkInTime);
            return checkIn.isValid() && checkIn.isBetween(startOfWeek, endOfWeek, undefined, '[]');
          }).length;

        const total = countWeekCheckins(faciAttendances) + countWeekCheckins(checkerAttendances);

        setStatsData(prev =>
          prev.map(card =>
            card.title === 'This Week'
              ? { ...card, value: total.toString() }
              : card
          )
        );
      } catch (err) {
        console.error('This-week check-ins error:', err);
        setStatsData(prev =>
          prev.map(card =>
            card.title === 'This Week'
              ? { ...card, value: '—', detail: 'Error' }
              : card
          )
        );
      }
    };

    fetchThisWeekCheckins();
  }, []);

  // ──────────────────────────────────────────────────────
  //  HELPER: Parse duty time & check completion
  // ──────────────────────────────────────────────────────
  const parseDutyTime = (timeStr, date) => {
    const [start, end] = timeStr.split('-').map(t => t.trim());
    const startTime = moment(`${date} ${start}`, 'YYYY-MM-DD h:mmA');
    const endTime = moment(`${date} ${end}`, 'YYYY-MM-DD h:mmA');
    if (!startTime.isValid() || !endTime.isValid()) return { startTime: null, endTime: null };
    return { startTime, endTime };
  };

  const isDutyCompleted = (duty, todayStr, checkins) => {
    const { startTime, endTime } = parseDutyTime(duty.time, todayStr);
    if (!startTime || !endTime) return true;
    if (moment().isBefore(endTime)) return true;

    return checkins.some(att => {
      const checkOut = att.checkOutTime ? moment(att.checkOutTime) : null;
      return (
        att.location === duty.room &&
        checkOut && checkOut.isAfter(endTime)
      );
    });
  };

  // ──────────────────────────────────────────────────────
  //  HELPER: Calculate attendance rate for a date range
  // ──────────────────────────────────────────────────────
  const calculateAttendanceRate = (scholars, duties, attendances, startDate, endDate) => {
    let totalExpected = 0;
    let totalPresent = 0;

    const dateRange = [];
    let current = startDate.clone();
    while (current <= endDate) {
      dateRange.push(current.format('YYYY-MM-DD'));
      current = current.clone().add(1, 'day');
    }

    scholars.forEach(scholar => {
      const scholarId = scholar.id || scholar._id?.toString();

      dateRange.forEach(dateStr => {
        const dayName = moment(dateStr).format('dddd');

        const scholarDuties = duties.filter(d =>
          d.id === scholarId &&
          d.day === dayName &&
          d.status === 'Active'
        );

        totalExpected += scholarDuties.length;

        scholarDuties.forEach(duty => {
          const checkins = attendances.filter(att =>
            att.studentId === scholarId &&
            moment(att.checkInTime).format('YYYY-MM-DD') === dateStr &&
            att.location === duty.room
          );

          const completed = checkins.some(att => {
            const checkOut = att.checkOutTime ? moment(att.checkOutTime) : null;
            const { endTime } = parseDutyTime(duty.time, dateStr);
            return endTime && checkOut && checkOut.isAfter(endTime);
          });

          if (completed) totalPresent++;
        });
      });
    });

    const rate = totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0;
    return { rate, totalExpected, totalPresent };
  };

  // ──────────────────────────────────────────────────────
  //  CHART CONFIG & FILTERS
  // ──────────────────────────────────────────────────────
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    barPercentage: 0.7,
    propsForBackgroundLines: { stroke: '#e5e7eb' },
  };

  const statusColors = { present: '#10b981', absent: '#ef4444' };
  const now = new Date();
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [selectedMonth, setSelectedMonth] = useState(MONTHS_FULL[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const selectedMonthIndex = MONTHS_FULL.indexOf(selectedMonth);

  const handleDateSelect = (year, monthName) => {
    setSelectedYear(year);
    setSelectedMonth(monthName);
    setIsModalVisible(false);
  };

  const isMonthWithHighAbsence = selectedMonth === 'Jan' || selectedMonth === 'Feb';

  const getOriginalBarData = () => {
    const defaultData = [
      { day: 'Mon', present: 95, absent: 5 },
      { day: 'Tue', present: 92, absent: 8 },
      { day: 'Wed', present: 88, absent: 12 },
      { day: 'Thu', present: 96, absent: 4 },
      { day: 'Fri', present: 90, absent: 10 },
    ];
    if (isMonthWithHighAbsence) {
      return defaultData.map((item) => ({
        ...item,
        present: Math.max(0, item.present - 10),
        absent: item.absent + 10,
      }));
    }
    return defaultData;
  };
  const originalBarData = getOriginalBarData();

  const getOriginalPieData = () => {
    if (isMonthWithHighAbsence) {
      return [
        { name: 'Present', population: 380, color: 'rgba(52, 199, 89, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'present' },
        { name: 'Absent', population: 100, color: 'rgba(239, 68, 68, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'absent' },
      ];
    }
    return [
      { name: 'Present', population: 450, color: 'rgba(52, 199, 89, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'present' },
      { name: 'Absent', population: 50, color: 'rgba(239, 68, 68, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'absent' },
    ];
  };
  const originalPieData = getOriginalPieData();

  const originalLineData = {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    datasets: [
      { data: [85, 90, 92, 88], color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`, strokeWidth: 2 },
      { data: [10, 8, 6, 10], color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, strokeWidth: 2 },
      { data: [5, 2, 2, 2], color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`, strokeWidth: 2 },
    ],
    legend: ['Present %', 'Absent %'],
  };

  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [selectedStatusesBar, setSelectedStatusesBar] = useState(['present', 'absent']);
  const [selectedPieStatuses, setSelectedPieStatuses] = useState(['present', 'absent']);
  const [selectedWeeks, setSelectedWeeks] = useState(['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4']);
  const [selectedStatusesLine, setSelectedStatusesLine] = useState(['present', 'absent']);

  const toggleDay = (day) => setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  const toggleStatusBar = (status) => setSelectedStatusesBar((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  const togglePieStatus = (status) => setSelectedPieStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  const toggleWeek = (week) => setSelectedWeeks((prev) => (prev.includes(week) ? prev.filter((w) => w !== week) : [...prev, week]));
  const toggleStatusLine = (status) => setSelectedStatusesLine((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));

  const filterBarData = () => {
    const filteredDaysData = originalBarData.filter((item) => selectedDays.includes(item.day));
    const data = [], labels = [], colors = [];

    filteredDaysData.forEach((item) => {
      if (selectedStatusesBar.includes('present')) { data.push(item.present); labels.push(`${item.day}\nPresent`); colors.push(() => statusColors.present); }
      if (selectedStatusesBar.includes('absent')) { data.push(item.absent); labels.push(`${item.day}\nAbsent`); colors.push(() => statusColors.absent); }
    });

    return { labels, datasets: [{ data, colors }], legend: selectedStatusesBar.map((s) => s.charAt(0).toUpperCase() + s.slice(1)) };
  };

  const filterPieData = () => originalPieData.filter((item) => selectedPieStatuses.includes(item.status));

  const filterLineData = () => {
    const filteredLabels = originalLineData.labels.filter((label) => selectedWeeks.includes(label));
    if (filteredLabels.length === 0) return { labels: [], datasets: [], legend: [] };

    const filteredDatasets = originalLineData.datasets
      .filter((_, i) => selectedStatusesLine.includes(['present', 'absent'][i]))
      .map((dataset) => ({
        ...dataset,
        data: dataset.data.filter((_, i) => selectedWeeks.includes(originalLineData.labels[i]))
      }));

    const filteredLegend = originalLineData.legend.filter((_, i) => selectedStatusesLine.includes(['present', 'absent'][i]));

    return { labels: filteredLabels, datasets: filteredDatasets, legend: filteredLegend };
  };

  const barChartKitData = filterBarData();
  const filteredPieData = filterPieData();
  const filteredLineData = filterLineData();

  const barFilters = (
    <View style={styles.filterMenuContainer}>
      <View style={styles.filterRow}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
          <FilterButton key={day} label={day} isSelected={selectedDays.includes(day)} onPress={() => toggleDay(day)} color="#333333ff" bgColor="#f3f4f6" />
        ))}
      </View>
      <View style={styles.filterRow}>
        <FilterButton label="Present" isSelected={selectedStatusesBar.includes('present')} onPress={() => toggleStatusBar('present')} color="#10b981" bgColor="#d1fae5" />
        <FilterButton label="Absent" isSelected={selectedStatusesBar.includes('absent')} onPress={() => toggleStatusBar('absent')} color="#ef4444" bgColor="#fee2e2" />
      </View>
    </View>
  );

  const pieFilters = (
    <View style={styles.filterMenuContainer}>
      <View style={styles.filterRow}>
        <FilterButton label="Present" isSelected={selectedPieStatuses.includes('present')} onPress={() => togglePieStatus('present')} color="#10b981" bgColor="#d1fae5" />
        <FilterButton label="Absent" isSelected={selectedPieStatuses.includes('absent')} onPress={() => togglePieStatus('absent')} color="#ef4444" bgColor="#fee2e2" />
      </View>
    </View>
  );

  const lineFilters = (
    <View style={styles.filterMenuContainer}>
      <View style={styles.filterRow}>
        {originalLineData.labels.map((week) => (
          <FilterButton key={week} label={week} isSelected={selectedWeeks.includes(week)} onPress={() => toggleWeek(week)} color="#333" bgColor="#f3f4f6" />
        ))}
      </View>
      <View style={styles.filterRow}>
        <FilterButton label="Present" isSelected={selectedStatusesLine.includes('present')} onPress={() => toggleStatusLine('present')} color="#10b981" bgColor="#d1fae5" />
        <FilterButton label="Absent" isSelected={selectedStatusesLine.includes('absent')} onPress={() => toggleStatusLine('absent')} color="#ef4444" bgColor="#fee2e2" />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionHeader}>Attendance Overview</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.cardsRow,
          Platform.OS === 'web' && { justifyContent: 'flex-end', marginLeft: 140 },
        ]}
      >
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </ScrollView>

      <View style={[styles.sectionHeaderRow, isSmallScreen && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <Text style={styles.sectionHeader}>Attendance Trends & Distribution</Text>
        <TouchableOpacity
          style={[styles.datePickerButton, isSmallScreen && { marginTop: 8, alignSelf: 'flex-start' }]}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#1d4ed8" style={{ marginRight: 8 }} />
          <Text style={styles.datePickerText}>{`${selectedMonth} ${selectedYear}`}</Text>
        </TouchableOpacity>
      </View>

      <DatePickerModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSelectDate={handleDateSelect}
        initialYear={selectedYear}
        initialMonthIndex={selectedMonthIndex}
      />

      {/* TOP SECTION: 3 COLUMNS */}
      <View style={isSmallScreen ? styles.topRowMobile : styles.topRow}>
        <View style={isSmallScreen ? styles.leftColumnMobile : styles.leftColumn}>
          <View style={styles.cardWrapper}>
            <PredictiveYearLevelAnalysis />
          </View>
        </View>

        <View style={isSmallScreen ? styles.centerColumnMobile : styles.centerColumn}>
          <View style={styles.cardWrapper}>
            <TopPerformingDepartments />
          </View>
        </View>

        <View style={isSmallScreen ? styles.rightColumnMobile : styles.rightColumn}>
          <GraphPlaceholder
            title={`Weekly Attendance Rate (${selectedMonth} ${selectedYear})`}
            height={isSmallScreen ? 300 : 340}
            filterMenu={lineFilters}
          >
            {filteredLineData.labels.length > 0 ? (
              <LineChart
                data={filteredLineData}
                height={isSmallScreen ? 240 : 300}
                chartConfig={chartConfig}
                bezier
                withVerticalLines={false}
                withDots
                showLegend
                withShadow
              />
            ) : (
              <Text style={styles.graphLabel}>No data selected.</Text>
            )}
          </GraphPlaceholder>
        </View>
      </View>

      {/* BOTTOM ROW: Daily + Monthly */}
      <View style={isSmallScreen ? styles.bottomRowMobile : styles.bottomRow}>
        <View style={isSmallScreen ? styles.chartColumnFull : styles.chartColumnNarrow}>
          <GraphPlaceholder
            title={`Daily Attendance Counts (${selectedMonth} ${selectedYear} | Mon-Fri)`}
            height={300}
            filterMenu={barFilters}
          >
            {barChartKitData.labels.length > 0 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barChartKitData}
                    width={Math.max(barChartKitData.labels.length * 120, 280)}
                    height={260}
                    fromZero
                    showValuesOnTopOfBars
                    flatColor
                    showBarTops={false}
                    withCustomBarColorFromData
                    chartConfig={{
                      ...chartConfig,
                      barPercentage: 0.5,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
                      propsForLabels: { fontSize: 11, fontWeight: '600' },
                      propsForBackgroundLines: { stroke: '#d1d5db', strokeDasharray: '4' },
                    }}
                    style={{ marginVertical: 10, borderRadius: 12, paddingRight: 20 }}
                  />
                </ScrollView>
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: statusColors.present }]} />
                    <Text style={styles.legendText}>Present</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: statusColors.absent }]} />
                    <Text style={styles.legendText}>Absent</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.graphLabel}>No data selected.</Text>
            )}
          </GraphPlaceholder>
        </View>

        <View style={isSmallScreen ? styles.chartColumnFull : styles.chartColumnWide}>
          <GraphPlaceholder
            title={`Monthly Distribution (${selectedMonth} ${selectedYear})`}
            height={340}
            filterMenu={pieFilters}
          >
            {filteredPieData.length > 0 ? (
              <PieChart
                data={filteredPieData}
                height={260}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="40"
                absolute
              />
            ) : (
              <Text style={styles.graphLabel}>No data selected.</Text>
            )}
          </GraphPlaceholder>
        </View>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

/* ──────────────────────────────────────────────────────────────
   STYLES – UNCHANGED
   ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fa' },
  contentContainer: { padding: 16 },
  sectionHeader: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 10 },
  cardsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  card: { width: 180, minHeight: 130, backgroundColor: 'white', borderRadius: 16, padding: 20, marginHorizontal: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  cardIcon: { marginBottom: 8, alignSelf: 'flex-start' },
  cardTitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 4 },
  cardDetail: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4, ...(Platform.OS === 'web' && { boxShadow: '0px 3px 8px rgba(0,0,0,0.15)' }) },
  datePickerText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  graphContainer: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6, ...(Platform.OS === 'web' && { boxShadow: '0px 4px 10px rgba(0,0,0,0.15), 0px 0px 4px rgba(0,0,0,0.05)' }) },
  graphTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
  graphBox: { backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 8, overflow: 'hidden' },
  graphLabel: { fontSize: 14, color: '#4b5563', textAlign: 'center', padding: 20 },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: -5, marginBottom: 10, gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendColor: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#333' },
  topRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  topRowMobile: { flexDirection: 'column', gap: 16, marginBottom: 24 },
  leftColumn: { flex: 1, maxWidth: '35%' },
  centerColumn: { flex: 1, maxWidth: '35%' },
  rightColumn: { flex: 1, maxWidth: '30%' },
  leftColumnMobile: { width: '100%' },
  centerColumnMobile: { width: '100%' },
  rightColumnMobile: { width: '100%' },
  bottomRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  bottomRowMobile: { flexDirection: 'column', gap: 16, marginBottom: 24 },
  chartColumnNarrow: { flex: 1, maxWidth: '70%' },
  chartColumnWide: { flex: 1, maxWidth: '30%' },
  chartColumnFull: { width: '100%' },
  filterMenuContainer: { marginBottom: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 8 },
  filterButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  filterButtonText: { fontSize: 12, fontWeight: '500' },
  centeredView: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: Math.min(width * 0.9, 400), position: 'absolute', top: width < 480 ? 160 : 80 },
  modalHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10 },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 10 },
  yearButton: { width: '20%', aspectRatio: 2, justifyContent: 'center', alignItems: 'center', padding: 5 },
  yearButtonSelected: { backgroundColor: '#6366f1', borderRadius: 8 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  monthButton: { width: '33.333%', aspectRatio: 2, justifyContent: 'center', alignItems: 'center', padding: 5 },
  monthButtonSelected: { backgroundColor: '#6366f1', borderRadius: 8 },
  dateText: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
  dateTextSelected: { color: 'white', fontWeight: '700' },
  closeButton: { position: 'absolute', top: 10, right: 12, zIndex: 10, borderRadius: 20, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  closeButtonText: { fontSize: 20, fontWeight: 'bold', lineHeight: 20 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  analysisCardTall: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    minHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 12px rgba(0,0,0,0.16), 0 0 8px rgba(0,0,0,0.6)',
    }),
  },
  cardWrapper: { flex: 1, justifyContent: 'space-between', minHeight: 420 },
  insightWrapper: { flex: 1, minHeight: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  analysisCardTitleBig: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 2 },
  analysisCardSubtitle: { fontSize: 11, color: '#6b7280' },
  yearLevelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 6 },
  yearLevelIconContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  yearLevelContent: { flex: 1, paddingLeft: 4 },
  yearLevelLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  yearLevelText: { fontSize: 11, color: '#6b7280', marginBottom: 5 },
  barChartContainer: { width: 70, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginRight: 10 },
  barChartBar: { height: '100%', borderRadius: 4 },
  trendBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, alignSelf: 'center', width: 68, alignItems: 'center' },
  trendText: { fontSize: 11, fontWeight: '600' },
  keyInsightBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  keyInsightLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  keyInsightText: { fontSize: 11, color: '#4b5563', lineHeight: 16, flexShrink: 1 },
  departmentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  rankBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#6b7280', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rankBadgeFirst: { backgroundColor: '#10b981' },
  rankText: { fontSize: 11, fontWeight: 'bold', color: 'white' },
  rankTextFirst: { color: 'white' },
  departmentContent: { flex: 1 },
  departmentName: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 3 },
  consistencyBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start', marginTop: 2 },
  consistencyText: { fontSize: 10, fontWeight: '600' },
  percentageText: { fontSize: 12, fontWeight: '600', color: '#333', marginLeft: 8 },
  summaryBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
  },
  summaryText: { fontSize: 11, color: '#166534', lineHeight: 16, flexShrink: 1 },
});

export default Dashboard;