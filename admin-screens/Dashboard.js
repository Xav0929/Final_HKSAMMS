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
import { YEARS, COURSES } from '../constants/scholarMeta';

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
const PredictiveYearLevelAnalysis = ({ items = [], insight }) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
        return 'trending-up-outline';
      case 'decreasing':
        return 'trending-down-outline';
      case 'stable':
        return 'arrow-forward-outline';
      default:
        return 'remove-outline';
    }
  };

  const displayItems = items.length
    ? items
    : YEARS.map((year) => ({
        year,
        share: 0,
        projectedShare: 0,
        count: 0,
        trend: 'stable',
        trendColor: '#6b7280',
      }));

  return (
    <View style={styles.analysisCardTall}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          <Ionicons name="analytics-outline" size={18} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.analysisCardTitleBig}>Predictive Year-Level Analysis</Text>
          <Text style={styles.analysisCardSubtitle}>Attendance share by academic year</Text>
        </View>
      </View>

      {displayItems.map((item) => (
        <View key={item.year} style={styles.yearLevelRow}>
          <View style={styles.yearLevelIconContainer}>
            <Ionicons name={getTrendIcon(item.trend)} size={18} color={item.trendColor} />
          </View>

          <View style={styles.yearLevelContent}>
            <Text style={styles.yearLevelLabel}>{item.year}</Text>
            <Text style={styles.yearLevelText}>
              Share: {Number(item.share || 0).toFixed(1)}% ({item.count || 0} scholars)
            </Text>
            {Number.isFinite(item.projectedShare) && (
              <Text style={styles.yearLevelProjection}>
                Projection: {Number(item.projectedShare || 0).toFixed(1)}%
              </Text>
            )}
          </View>

          <View style={styles.barChartContainer}>
            <View
              style={[
                styles.barChartBar,
                {
                  width: `${Math.max(Number(item.share || 0), Number(item.projectedShare || 0)) * 0.75}%`,
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
                  item.trend === 'stable'
                    ? '#f3f4f6'
                    : item.trend === 'increasing'
                    ? '#dbeafe'
                    : '#fee2e2',
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
            {insight || 'Year-level analytics will appear here once data is available.'}
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ──────────────────────────────────────────────────────────────
   Top 5 Performing Departments Card
   ────────────────────────────────────────────────────────────── */
const TopPerformingDepartments = ({ departments = [], insight }) => {
  const displayDepartments = departments.length
    ? departments
    : COURSES.slice(0, 5).map((course, index) => ({
        rank: index + 1,
        name: course,
        share: 0,
        count: 0,
        consistency: 'no data',
        consistencyColor: '#9ca3af',
      }));

  return (
    <View style={styles.analysisCardTall}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          <Ionicons name="people-outline" size={18} color="#10b981" />
        </View>
        <View>
          <Text style={styles.analysisCardTitleBig}>Top 5 Performing Departments</Text>
          <Text style={styles.analysisCardSubtitle}>Departments with the largest scholar share</Text>
        </View>
      </View>

      {displayDepartments.map((dept) => (
        <View key={dept.rank} style={styles.departmentRow}>
          <View style={[styles.rankBadge, dept.rank === 1 && styles.rankBadgeFirst]}>
            <Text style={[styles.rankText, dept.rank === 1 && styles.rankTextFirst]}>{dept.rank}</Text>
          </View>
          <View style={styles.departmentContent}>
            <Text style={styles.departmentName}>{dept.name}</Text>
            <Text style={styles.departmentDetail}>
              {dept.consistency} · {Number(dept.share || 0).toFixed(1)}% ({dept.count || 0} scholars)
            </Text>
          </View>
          <View style={[styles.consistencyBadge, { backgroundColor: dept.consistencyColor }]}>
            <Text style={styles.consistencyText}>Share</Text>
          </View>
        </View>
      ))}

      <View style={styles.summaryBox}>
        <Text style={styles.keyInsightLabel}>Key Insight</Text>
        <View style={styles.insightWrapper}>
          <Text style={styles.summaryText}>
            {insight || 'Department analytics will appear here once data is available.'}
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ──────────────────────────────────────────────────────────────
   GraphPlaceholder, FilterButton, DatePickerModal
   ────────────────────────────────────────────────────────────── */
const GraphPlaceholder = ({ title, height = 200, children, filterMenu = null, datePickerButton = null }) => {
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
      <View style={styles.graphTitleRow}>
        <Text style={styles.graphTitle}>{title}</Text>
        {datePickerButton}
      </View>
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
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  // Show years from currentYear + 3 down to currentYear - 7 to include 2024
  const YEARS = Array.from({ length: 11 }, (_, i) => currentYear + 3 - i).sort((a, b) => b - a);

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(initialMonthIndex);

  const handleSelect = (year, monthIndex) => {
    // Pass full month name to match MONTHS_FULL in Dashboard
    onSelectDate(year, MONTHS_FULL[monthIndex]);
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
            {MONTHS_SHORT.map((month, index) => (
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
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && window.innerWidth < 768;
    }
    return width < 768;
  });
  
  // Update screen size on window resize
  useEffect(() => {
    const updateScreenSize = () => {
      let currentWidth;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        currentWidth = window.innerWidth;
      } else {
        currentWidth = Dimensions.get('window').width;
      }
      const isSmall = currentWidth < 768;
      setIsSmallScreen(isSmall);
      if (Platform.OS === 'web') {
        console.log(`[Responsive] Screen width: ${currentWidth}px, isSmallScreen: ${isSmall}`);
      }
    };
    
    updateScreenSize();
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('resize', updateScreenSize);
      window.addEventListener('orientationchange', updateScreenSize);
      return () => {
        window.removeEventListener('resize', updateScreenSize);
        window.removeEventListener('orientationchange', updateScreenSize);
      };
    } else {
      const subscription = Dimensions.addEventListener('change', updateScreenSize);
      return () => subscription?.remove();
    }
  }, []);

  // ──────────────────────────────────────────────────────
  //  ALL useState at the top
  // ──────────────────────────────────────────────────────
  const [totalScholars, setTotalScholars] = useState('...');
  const [scholarGrowth, setScholarGrowth] = useState('...');
  const [presentToday, setPresentToday] = useState('...');
  const [absentToday, setAbsentToday] = useState('...');
  const [weeklyAverage, setWeeklyAverage] = useState('...');
  const [weeklyGrowth, setWeeklyGrowth] = useState('...');

  const [realPieData, setRealPieData] = useState([
    { name: 'Present', population: 0, color: 'rgba(52, 199, 89, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'present' },
    { name: 'Absent',  population: 0, color: 'rgba(239, 68, 68, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'absent' },
  ]);
  const [thisWeekSummary, setThisWeekSummary] = useState({ total: 0, present: 0, absent: 0 });
  const weekDayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const defaultWorkDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const initialWeeklyTemplate = weekDayOrder.map((day) => ({ day, present: 0, absent: 0, total: 0 }));
  const [weeklyDailyStatus, setWeeklyDailyStatus] = useState(initialWeeklyTemplate);

  const [lineChartDailyStatus, setLineChartDailyStatus] = useState(initialWeeklyTemplate);
  const [lineChartSummary, setLineChartSummary] = useState({ total: 0, present: 0, absent: 0 });
  const [barChartDailyStatus, setBarChartDailyStatus] = useState(initialWeeklyTemplate);
  const [barChartSummary, setBarChartSummary] = useState({ total: 0, present: 0, absent: 0 });
  const [pieChartDailyStatus, setPieChartDailyStatus] = useState(initialWeeklyTemplate);
  const [pieChartSummary, setPieChartSummary] = useState({ total: 0, present: 0, absent: 0 });
  const [pieChartData, setPieChartData] = useState([
    { name: 'Present', population: 0, color: 'rgba(52, 199, 89, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'present' },
    { name: 'Absent',  population: 0, color: 'rgba(239, 68, 68, 0.8)', legendFontColor: '#333', legendFontSize: 12, status: 'absent' },
  ]);
  const [yearLevelPerformance, setYearLevelPerformance] = useState([]);
  const [yearLevelInsight, setYearLevelInsight] = useState('');
  const [topDepartments, setTopDepartments] = useState([]);
  const [departmentInsight, setDepartmentInsight] = useState('');

  const [statsData, setStatsData] = useState([
    { title: 'Total Scholar', value: '...', detail: '... This Month', detailColor: '#6b7280', iconName: 'school-outline' },
    { title: 'Present Today', value: '...', detail: 'Loading...', detailColor: 'green', iconName: 'checkmark-circle-outline' },
    { title: 'Absent Today', value: '...', detail: 'Loading...', detailColor: 'red', iconName: 'close-circle-outline' },
    { title: 'Weekly Average', value: '...', detail: '... From last week', detailColor: '#6b7280', iconName: 'trending-up-outline' },
    { title: 'Monthly Goal', value: '80%', detail: 'Attendance Target: 90%', detailColor: '#60a5fa', iconName: 'flag-outline' },
    { title: 'This Week', value: '...', detail: 'Total Check-ins', detailColor: 'green', iconName: 'calendar-outline' },
  ]);

  // ──────────────────────────────────────────────────────
  //  DATE SELECTION
  // ──────────────────────────────────────────────────────
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS_FULL[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const selectedMonthIndex = MONTHS_FULL.indexOf(selectedMonth);

  const [lineChartMonth, setLineChartMonth] = useState(MONTHS_FULL[now.getMonth()]);
  const [lineChartYear, setLineChartYear] = useState(now.getFullYear());
  const [isLineChartModalVisible, setIsLineChartModalVisible] = useState(false);
  const lineChartMonthIndex = MONTHS_FULL.indexOf(lineChartMonth);

  const [barChartMonth, setBarChartMonth] = useState(MONTHS_FULL[now.getMonth()]);
  const [barChartYear, setBarChartYear] = useState(now.getFullYear());
  const [isBarChartModalVisible, setIsBarChartModalVisible] = useState(false);
  const barChartMonthIndex = MONTHS_FULL.indexOf(barChartMonth);

  const [pieChartMonth, setPieChartMonth] = useState(MONTHS_FULL[now.getMonth()]);
  const [pieChartYear, setPieChartYear] = useState(now.getFullYear());
  const [isPieChartModalVisible, setIsPieChartModalVisible] = useState(false);
  const pieChartMonthIndex = MONTHS_FULL.indexOf(pieChartMonth);

  const handleDateSelect = (year, monthName) => {
    setSelectedYear(year);
    setSelectedMonth(monthName);
    setIsModalVisible(false);
  };

  const handleLineChartDateSelect = (year, monthName) => {
    setLineChartYear(year);
    setLineChartMonth(monthName);
    setIsLineChartModalVisible(false);
  };

  const handleBarChartDateSelect = (year, monthName) => {
    setBarChartYear(year);
    setBarChartMonth(monthName);
    setIsBarChartModalVisible(false);
  };

  const handlePieChartDateSelect = (year, monthName) => {
    setPieChartYear(year);
    setPieChartMonth(monthName);
    setIsPieChartModalVisible(false);
  };

  // ──────────────────────────────────────────────────────
  //  FETCH SCHOLARS + GROWTH
  // ──────────────────────────────────────────────────────
 useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const [scholarsRes, attendanceRes] = await Promise.all([
        fetch('http://192.168.86.39:8000/api/scholars'),
        fetch(`http://192.168.86.39:8000/api/attendance?month=10&year=2025`),
      ]);

      const scholars = await scholarsRes.json();
      const attendance = await attendanceRes.json();

      // Total Scholars
      setTotalScholars(scholars.length.toString());

      // Present / Absent Today
      const today = moment().format('YYYY-MM-DD');
      const todayRecords = attendance.filter(a => moment(a.encodedTime).format('YYYY-MM-DD') === today);
      const present = todayRecords.filter(a => a.classStatus === 'Present').length;
      const absent = todayRecords.filter(a => a.classStatus === 'Absent').length;

      setPresentToday(present.toString());
      setAbsentToday(absent.toString());

      // Weekly Average (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = moment().subtract(i, 'days').format('YYYY-MM-DD');
        const dayRecords = attendance.filter(a => moment(a.encodedTime).format('YYYY-MM-DD') === d);
        const p = dayRecords.filter(a => a.classStatus === 'Present').length;
        const total = dayRecords.length;
        return { p, total };
      });

      const weeklyPresent = last7Days.reduce((sum, d) => sum + d.p, 0);
      const weeklyTotal = last7Days.reduce((sum, d) => sum + d.total, 0);
      const weeklyRate = weeklyTotal > 0 ? (weeklyPresent / weeklyTotal) * 100 : 0;
      setWeeklyAverage(`${weeklyRate.toFixed(0)}%`);

      // Growth (vs previous week)
      const prev7Days = Array.from({ length: 7 }, (_, i) => {
        const d = moment().subtract(i + 7, 'days').format('YYYY-MM-DD');
        const dayRecords = attendance.filter(a => moment(a.encodedTime).format('YYYY-MM-DD') === d);
        const p = dayRecords.filter(a => a.classStatus === 'Present').length;
        const total = dayRecords.length;
        return { p, total };
      });

      const prevPresent = prev7Days.reduce((sum, d) => sum + d.p, 0);
      const prevTotal = prev7Days.reduce((sum, d) => sum + d.total, 0);
      const prevRate = prevTotal > 0 ? (prevPresent / prevTotal) * 100 : 0;
      const growth = weeklyRate - prevRate;
      setWeeklyGrowth(growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`);

      // Year-Level & Department Analysis
      const totalForShare = scholars.length || 1;

      const yearSummary = YEARS.map(year => {
        const count = scholars.filter(s => s.year === year).length;
        const share = Number(((count / totalForShare) * 100).toFixed(1));
        return { year, count, share };
      });

      const topYear = yearSummary.reduce((a, b) => a.share > b.share ? a : b, { share: 0 });
      const bottomYear = yearSummary.filter(y => y.year !== topYear.year).reduce((a, b) => a.share < b.share ? a : b, { share: 100 });

      setYearLevelPerformance(yearSummary.map(item => ({
        ...item,
        projectedShare: Number(Math.min(100, item.share + 1.5).toFixed(1)),
        trend: item.share === topYear.share ? 'increasing' : item.share === bottomYear.share ? 'decreasing' : 'stable',
        trendColor: item.share === topYear.share ? '#3b82f6' : item.share === bottomYear.share ? '#ef4444' : '#6b7280'
      })));

      // Generate informative year-level insight
      if (topYear.share > 0 && yearSummary.length > 0) {
        const totalScholars = yearSummary.reduce((sum, y) => sum + y.count, 0);
        const avgShare = (100 / yearSummary.length).toFixed(1);
        const insights = [];
        
        if (topYear.share > parseFloat(avgShare) * 1.2) {
          insights.push(`${topYear.year} dominates with ${topYear.share}% of all scholars (${topYear.count} students), significantly above the average distribution.`);
        } else {
          insights.push(`${topYear.year} leads with ${topYear.share}% share, representing ${topYear.count} scholars in the program.`);
        }
        
        const stableYears = yearSummary.filter(y => y.share >= parseFloat(avgShare) * 0.8 && y.share <= parseFloat(avgShare) * 1.2);
        if (stableYears.length > 1) {
          insights.push(`Distribution is balanced across ${stableYears.length} year levels, indicating healthy enrollment.`);
        }
        
        setYearLevelInsight(insights.join(' '));
      } else {
        setYearLevelInsight('Year-level analytics will appear here once scholar data is available.');
      }

      const deptMap = new Map();
      scholars.forEach(s => {
        const course = s.course || 'Unknown';
        deptMap.set(course, (deptMap.get(course) || 0) + 1);
      });

      const deptSummary = Array.from(deptMap.entries())
        .map(([name, count]) => ({
          name,
          count,
          share: Number(((count / totalForShare) * 100).toFixed(1))
        }))
        .sort((a, b) => b.share - a.share)
        .slice(0, 5)
        .map((d, i) => ({
          ...d,
          rank: i + 1,
          consistency: d.share >= 25 ? 'high share' : d.share >= 15 ? 'steady share' : 'growing share',
          consistencyColor: d.share >= 25 ? '#10b981' : d.share >= 15 ? '#6b7280' : '#f59e0b'
        }));

      setTopDepartments(deptSummary);
      
      // Generate informative department insight
      if (deptSummary.length > 0) {
        const insights = [];
        const topDept = deptSummary[0];
        
        insights.push(`${topDept.name} leads with ${topDept.share}% of all scholars (${topDept.count} students).`);
        
        if (topDept.share >= 25) {
          insights.push(`This department has a strong presence with over a quarter of the total scholar population.`);
        } else if (topDept.share >= 15) {
          insights.push(`This department maintains a steady representation among all programs.`);
        }
        
        if (deptSummary.length >= 3) {
          const top3Total = deptSummary.slice(0, 3).reduce((sum, d) => sum + d.share, 0);
          insights.push(`The top 3 departments account for ${top3Total.toFixed(1)}% of scholars, showing concentrated participation.`);
        }
        
        if (deptSummary.length >= 5) {
          const diversity = deptSummary.length;
          insights.push(`The program spans ${diversity} different departments, reflecting diverse academic interests.`);
        }
        
        setDepartmentInsight(insights.join(' '));
      } else {
        setDepartmentInsight('Department analytics will appear here once scholar data is available.');
      }

    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  fetchDashboardData();
}, []);
  // ──────────────────────────────────────────────────────
  //  FETCH TODAY'S PRESENT/ABSENT
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTodayAbsences = async () => {
      try {
        const [dutiesRes, attendanceRes, scholarsRes] = await Promise.all([
          fetch('http://192.168.86.39:8000/api/duties'),
          fetch('http://192.168.86.39:8000/api/faci-attendance'),
          fetch('http://192.168.86.39:8000/api/scholars'),
        ]);

        if (!dutiesRes.ok || !attendanceRes.ok || !scholarsRes.ok) throw new Error('Failed to fetch data');

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

        setPresentToday(presentScholars.size.toString());
        setAbsentToday(absentScholars.size.toString());
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
          fetch('http://192.168.86.39:8000/api/duties'),
          fetch('http://192.168.86.39:8000/api/faci-attendance'),
          fetch('http://192.168.86.39:8000/api/scholars'),
        ]);

        if (!dutiesRes.ok || !attendanceRes.ok || !scholarsRes.ok) throw new Error('Failed to fetch data');

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
  //  UPDATE ALL CARDS WHEN DATA CHANGES
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    setStatsData(prev => {
      const updated = [...prev];

      updated[0] = {
        ...updated[0],
        value: totalScholars,
        detail: `${scholarGrowth} This Month`,
        detailColor: scholarGrowth.startsWith('+') ? 'green' : scholarGrowth === '...' ? '#6b7280' : 'red',
      };

      updated[1] = {
        ...updated[1],
        value: presentToday,
        detail: presentToday !== '...' && totalScholars !== '...'
          ? `${((parseInt(presentToday) / parseInt(totalScholars)) * 100).toFixed(0)}% Attendance Rate`
          : 'Loading...',
        detailColor: 'green',
      };

      updated[2] = {
        ...updated[2],
        value: absentToday,
        detail: absentToday !== '...' && totalScholars !== '...'
          ? `${((parseInt(absentToday) / parseInt(totalScholars)) * 100).toFixed(0)}% Absence Rate`
          : 'Loading...',
        detailColor: 'red',
      };

      updated[3] = {
        ...updated[3],
        value: weeklyAverage,
        detail: `${weeklyGrowth} From last week`,
        detailColor: weeklyGrowth.startsWith('+') ? 'green' : weeklyGrowth === '...' ? '#6b7280' : 'red',
      };

      return updated;
    });
  }, [totalScholars, scholarGrowth, presentToday, absentToday, weeklyAverage, weeklyGrowth]);

  // ──────────────────────────────────────────────────────
  //  HELPER: Fetch week data for a given month/year
  // ──────────────────────────────────────────────────────
  const fetchWeekDataForMonth = async (year, monthName, setDailyStatus, setSummary, setPieData = null) => {
    try {
      const monthIndex = MONTHS_FULL.indexOf(monthName);
      if (monthIndex === -1) {
        throw new Error(`Invalid month name: ${monthName}`);
      }

      // Try to fetch data for the specific month/year if API supports it
      // Otherwise fetch all data and filter client-side
      const monthNumber = monthIndex + 1;
      
      // Try fetching from attendance API first for better filtering
      let attendanceData = [];
      try {
        const attendanceRes = await fetch(`http://192.168.86.39:8000/api/attendance?month=${monthNumber}&year=${year}`);
        if (attendanceRes.ok) {
          attendanceData = await attendanceRes.json();
        }
      } catch (e) {
        console.log('Attendance API not available, using faci/checker endpoints');
      }

      // Also fetch from faci and checker endpoints
      const [faciRes, checkerRes] = await Promise.all([
        fetch('http://192.168.86.39:8000/api/faci-attendance'),
        fetch('http://192.168.86.39:8000/api/checkerAttendance'),
      ]);

      const faciAttendances = faciRes.ok ? await faciRes.json() : [];
      const checkerAttendances = checkerRes.ok ? await checkerRes.json() : [];

      const now = moment();
      const selectedDate = moment(`${year}-${monthNumber}-01`, 'YYYY-M-D');
      
      // Determine week range - show current week if selected month is current month, otherwise first week
      let startOfWeek, endOfWeek;
      if (selectedDate.year() === now.year() && selectedDate.month() === now.month()) {
        // Current month - show current week
        startOfWeek = now.clone().startOf('week');
        endOfWeek = now.clone().endOf('week');
      } else {
        // Past/future month - show first week of that month
        startOfWeek = selectedDate.clone().startOf('month').startOf('week');
        endOfWeek = selectedDate.clone().startOf('month').endOf('week');
        
        // Limit to the month boundary
        const monthStart = selectedDate.clone().startOf('month');
        const monthEnd = selectedDate.clone().endOf('month');
        if (startOfWeek.isBefore(monthStart)) startOfWeek = monthStart.clone();
        if (endOfWeek.isAfter(monthEnd)) endOfWeek = monthEnd.clone();
      }

      // Filter function for attendance records
      const filterWeek = (records, useEncodedTime = false) => {
        return records.filter(att => {
          let timestamp;
          if (useEncodedTime && att.encodedTime) {
            timestamp = att.encodedTime;
          } else {
            timestamp = att.checkInTime || att.scheduleDate || att.createdAt || att.encodedTime;
          }
          if (!timestamp) return false;
          
          // Parse timestamp - handle YYYY-MM-DD HH:mm:ss format
          let checkIn;
          if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
            checkIn = moment(timestamp, 'YYYY-MM-DD HH:mm:ss', true);
          } else {
            checkIn = moment(timestamp);
          }
          
          if (!checkIn.isValid()) return false;
          return checkIn.isBetween(startOfWeek, endOfWeek, undefined, '[]');
        });
      };

      // Process attendance API data
      const attendanceWeek = filterWeek(attendanceData, true);
      
      // Process faci and checker data
      const faciWeek = filterWeek(faciAttendances);
      const checkerWeek = filterWeek(checkerAttendances);
      
      // Combine all records
      const combinedWeekRecords = [...attendanceWeek, ...faciWeek, ...checkerWeek];

      const dailyTemplate = weekDayOrder.map((day) => ({ day, present: 0, absent: 0, total: 0 }));
      const dayLookup = dailyTemplate.reduce((acc, item) => {
        acc[item.day] = item;
        return acc;
      }, {});

      combinedWeekRecords.forEach((att) => {
        let timestamp = att.encodedTime || att.checkInTime || att.scheduleDate || att.createdAt;
        if (!timestamp) return;
        
        // Parse timestamp - handle YYYY-MM-DD HH:mm:ss format
        let checkIn;
        if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
          checkIn = moment(timestamp, 'YYYY-MM-DD HH:mm:ss', true);
        } else {
          checkIn = moment(timestamp);
        }
        
        if (!checkIn.isValid()) return;
        
        const dayLabel = checkIn.format('ddd');
        const bucket = dayLookup[dayLabel];
        if (!bucket) return;

        bucket.total += 1;
        
        // Handle different status formats
        let status = '';
        if (att.classStatus) {
          status = att.classStatus.toLowerCase().trim();
        } else if (typeof att.status === 'string') {
          status = att.status.toLowerCase().trim();
        }
        
        if (status === 'present' || status === 'pending' || status === '' || !att.status) {
          bucket.present += 1;
        } else if (status === 'absent') {
          bucket.absent += 1;
        } else {
          bucket.present += 1;
        }
      });

      const presentCount = dailyTemplate.reduce((sum, item) => sum + item.present, 0);
      const absentCount = dailyTemplate.reduce((sum, item) => sum + item.absent, 0);
      const total = dailyTemplate.reduce((sum, item) => sum + item.total, 0);

      setDailyStatus(dailyTemplate);
      setSummary({ total, present: presentCount, absent: absentCount });

      if (setPieData) {
        setPieData(prev => prev.map(item => {
          if (item.status === 'present') return { ...item, population: presentCount };
          if (item.status === 'absent') return { ...item, population: absentCount };
          return item;
        }));
      }
    } catch (err) {
      console.error('Week data fetch error:', err);
      const emptyTemplate = weekDayOrder.map((day) => ({ day, present: 0, absent: 0, total: 0 }));
      setDailyStatus(emptyTemplate);
      setSummary({ total: 0, present: 0, absent: 0 });
      if (setPieData) {
        setPieData(prev => prev.map(item => ({ ...item, population: 0 })));
      }
    }
  };

  // ──────────────────────────────────────────────────────
  //  FETCH THIS WEEK TOTAL CHECK-INS (Based on selected month/year)
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchWeekDataForSelectedMonth = async () => {
      try {
        const monthIndex = MONTHS_FULL.indexOf(selectedMonth);
        const monthNumber = monthIndex + 1;
        const res = await fetch(`http://192.168.86.39:8000/api/attendance?month=${monthNumber}&year=${selectedYear}`);
        const records = await res.json();

        const daily = weekDayOrder.map(day => ({ day, present: 0, absent: 0, total: 0 }));
        const dayMap = Object.fromEntries(daily.map(d => [d.day, d]));

        // Determine the week range for the selected month
        const now = moment();
        const selectedDate = moment(`${selectedYear}-${monthNumber}-01`, 'YYYY-M-D');
        let startOfWeek, endOfWeek;
        
        if (selectedDate.year() === now.year() && selectedDate.month() === now.month()) {
          // Current month - show current week
          startOfWeek = now.clone().startOf('week');
          endOfWeek = now.clone().endOf('week');
        } else {
          // Past month - show first week of that month
          startOfWeek = selectedDate.clone().startOf('month').startOf('week');
          endOfWeek = selectedDate.clone().startOf('month').endOf('week');
        }

        // Filter records for the selected week
        records.forEach(r => {
          // Parse encodedTime - try multiple formats
          let recordDate;
          if (typeof r.encodedTime === 'string') {
            // Try YYYY-MM-DD HH:mm:ss format first (our generated data)
            recordDate = moment(r.encodedTime, 'YYYY-MM-DD HH:mm:ss', true);
            if (!recordDate.isValid()) {
              // Fallback to other formats
              recordDate = moment(r.encodedTime);
            }
          } else {
            recordDate = moment(r.encodedTime);
          }
          
          if (!recordDate.isValid()) return;
          if (!recordDate.isBetween(startOfWeek, endOfWeek, undefined, '[]')) return;
          
          const dayLabel = recordDate.format('ddd');
          const bucket = dayMap[dayLabel];
          if (!bucket) return;
          bucket.total++;
          if (r.classStatus === 'Present') bucket.present++;
          else if (r.classStatus === 'Absent') bucket.absent++;
        });

        const present = daily.reduce((s, d) => s + d.present, 0);
        const absent = daily.reduce((s, d) => s + d.absent, 0);
        const total = daily.reduce((s, d) => s + d.total, 0);

        setWeeklyDailyStatus(daily);
        setThisWeekSummary({ present, absent, total });

        setRealPieData(prev => prev.map(item => {
          if (item.status === 'present') return { ...item, population: present };
          if (item.status === 'absent') return { ...item, population: absent };
          return item;
        }));

      } catch (err) {
        console.error('Week data fetch error:', err);
        const emptyDaily = weekDayOrder.map(day => ({ day, present: 0, absent: 0, total: 0 }));
        setWeeklyDailyStatus(emptyDaily);
        setThisWeekSummary({ present: 0, absent: 0, total: 0 });
      }
    };

    fetchWeekDataForSelectedMonth();
  }, [selectedMonth, selectedYear]);

  // ──────────────────────────────────────────────────────
  //  FETCH DATA FOR CHARTS (Based on date picker selections)
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchWeekDataForMonth(lineChartYear, lineChartMonth, setLineChartDailyStatus, setLineChartSummary);
  }, [lineChartYear, lineChartMonth]);

  useEffect(() => {
    fetchWeekDataForMonth(barChartYear, barChartMonth, setBarChartDailyStatus, setBarChartSummary);
  }, [barChartYear, barChartMonth]);

  useEffect(() => {
    fetchWeekDataForMonth(pieChartYear, pieChartMonth, setPieChartDailyStatus, setPieChartSummary, setPieChartData);
  }, [pieChartYear, pieChartMonth]);

  useEffect(() => {
    setRealPieData(prev => prev.map(item => {
      if (item.status === 'present') {
        return { ...item, population: thisWeekSummary.total > 0 ? thisWeekSummary.present : 0 };
      }
      if (item.status === 'absent') {
        return { ...item, population: thisWeekSummary.total > 0 ? thisWeekSummary.absent : 0 };
      }
      return item;
    }));
  }, [thisWeekSummary]);

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
  //  HELPER: Calculate attendance rate
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

  const [selectedDays, setSelectedDays] = useState(defaultWorkDays);
  const [selectedStatusesBar, setSelectedStatusesBar] = useState(['present', 'absent']);
  const [selectedPieStatuses, setSelectedPieStatuses] = useState(['present', 'absent']);
  const [selectedLineDays, setSelectedLineDays] = useState(defaultWorkDays);
  const [selectedStatusesLine, setSelectedStatusesLine] = useState(['present', 'absent']);

  const toggleDay = (day) => setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  const toggleStatusBar = (status) => setSelectedStatusesBar((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  const togglePieStatus = (status) => setSelectedPieStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  const toggleLineDay = (day) => setSelectedLineDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  const toggleStatusLine = (status) => setSelectedStatusesLine((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));

  const filterBarData = () => {
    const filteredDaysData = barChartDailyStatus.filter((item) => selectedDays.includes(item.day));
    if (filteredDaysData.length === 0) {
      return { labels: [], datasets: [], legend: [] };
    }

    const data = [];
    const labels = [];
    const colors = [];

    filteredDaysData.forEach((item) => {
      if (selectedStatusesBar.includes('present')) {
        data.push(item.present || 0);
        labels.push(`${item.day}\nPresent`);
        colors.push(() => statusColors.present);
      }
      if (selectedStatusesBar.includes('absent')) {
        data.push(item.absent || 0);
        labels.push(`${item.day}\nAbsent`);
        colors.push(() => statusColors.absent);
      }
    });

    const legend = selectedStatusesBar
      .filter((status) => ['present', 'absent'].includes(status))
      .map((status) => status.charAt(0).toUpperCase() + status.slice(1));

    return { labels, datasets: [{ data, colors }], legend };
  };

  const filterPieData = () => pieChartData.filter((item) => selectedPieStatuses.includes(item.status));

  const filterLineData = () => {
    const filteredDaysData = lineChartDailyStatus.filter((item) => selectedLineDays.includes(item.day));
    if (filteredDaysData.length === 0) {
      return { labels: [], datasets: [], legend: [] };
    }

    const datasets = [];
    const legend = [];

    if (selectedStatusesLine.includes('present')) {
      datasets.push({
        data: filteredDaysData.map((item) => item.present || 0),
        color: (opacity = 1) => statusColors.present,
        strokeWidth: 2,
      });
      legend.push('Present');
    }

    if (selectedStatusesLine.includes('absent')) {
      datasets.push({
        data: filteredDaysData.map((item) => item.absent || 0),
        color: (opacity = 1) => statusColors.absent,
        strokeWidth: 2,
      });
      legend.push('Absent');
    }

    return { labels: filteredDaysData.map((item) => item.day), datasets, legend };
  };

  const barChartKitData = filterBarData();
  const filteredPieData = filterPieData();
  const filteredLineData = filterLineData();

  const barFilters = (
    <View style={styles.filterMenuContainer}>
      <View style={styles.filterRow}>
        {weekDayOrder.map((day) => (
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
        {weekDayOrder.map((day) => (
          <FilterButton key={day} label={day} isSelected={selectedLineDays.includes(day)} onPress={() => toggleLineDay(day)} color="#333" bgColor="#f3f4f6" />
        ))}
      </View>
      <View style={styles.filterRow}>
        <FilterButton label="Present" isSelected={selectedStatusesLine.includes('present')} onPress={() => toggleStatusLine('present')} color="#10b981" bgColor="#d1fae5" />
        <FilterButton label="Absent" isSelected={selectedStatusesLine.includes('absent')} onPress={() => toggleStatusLine('absent')} color="#ef4444" bgColor="#fee2e2" />
      </View>
    </View>
  );

  const totalPie = pieChartData.reduce((sum, item) => sum + (item.population || 0), 0);
  const presentSlice = pieChartData.find((item) => item.status === 'present');
  const presentPercent = totalPie > 0 && presentSlice
    ? ((presentSlice.population / totalPie) * 100).toFixed(1)
    : '0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionHeader}>Attendance Overview</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.cardsRow,
          Platform.OS === 'web' && { justifyContent: 'flex-end'  },
        ]}
      >
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </ScrollView>

      <View style={[styles.sectionHeaderRow, isSmallScreen && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <Text style={styles.sectionHeader}>Attendance Trends & Distribution</Text>
      </View>

      <DatePickerModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSelectDate={handleDateSelect}
        initialYear={selectedYear}
        initialMonthIndex={selectedMonthIndex}
      />

      <View style={isSmallScreen ? styles.topRowMobile : styles.topRow}>
        <View style={isSmallScreen ? styles.leftColumnMobile : styles.leftColumn}>
          <View style={isSmallScreen ? styles.cardWrapperMobile : styles.cardWrapper}>
            <PredictiveYearLevelAnalysis items={yearLevelPerformance} insight={yearLevelInsight} />
          </View>
        </View>

        <View style={isSmallScreen ? styles.centerColumnMobile : styles.centerColumn}>
          <View style={styles.cardWrapper}>
            <TopPerformingDepartments departments={topDepartments} insight={departmentInsight} />
          </View>
        </View>

        <View style={isSmallScreen ? styles.rightColumnMobile : styles.rightColumn}>
          <GraphPlaceholder
            title={`Weekly Attendance Trend (This Week)`}
            height={isSmallScreen ? 300 : 340}
            filterMenu={lineFilters}
            datePickerButton={
              <TouchableOpacity
                style={styles.datePickerButtonSmall}
                onPress={() => setIsLineChartModalVisible(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#1d4ed8" style={{ marginRight: 6 }} />
                <Text style={styles.datePickerTextSmall}>{`${lineChartMonth.slice(0, 3)} ${lineChartYear}`}</Text>
              </TouchableOpacity>
            }
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

      <View style={isSmallScreen ? styles.bottomRowMobile : styles.bottomRow}>
        <View style={isSmallScreen ? styles.chartColumnFull : styles.chartColumnNarrow}>
          <GraphPlaceholder
            title={`Daily Attendance Counts (This Week)`}
            height={300}
            filterMenu={barFilters}
            datePickerButton={
              <TouchableOpacity
                style={styles.datePickerButtonSmall}
                onPress={() => setIsBarChartModalVisible(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#1d4ed8" style={{ marginRight: 6 }} />
                <Text style={styles.datePickerTextSmall}>{`${barChartMonth.slice(0, 3)} ${barChartYear}`}</Text>
              </TouchableOpacity>
            }
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
            title={`This Week Distribution - ${presentPercent}% Present`}
            height={340}
            filterMenu={pieFilters}
            datePickerButton={
              <TouchableOpacity
                style={styles.datePickerButtonSmall}
                onPress={() => setIsPieChartModalVisible(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#1d4ed8" style={{ marginRight: 6 }} />
                <Text style={styles.datePickerTextSmall}>{`${pieChartMonth.slice(0, 3)} ${pieChartYear}`}</Text>
              </TouchableOpacity>
            }
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

      <DatePickerModal
        isVisible={isLineChartModalVisible}
        onClose={() => setIsLineChartModalVisible(false)}
        onSelectDate={handleLineChartDateSelect}
        initialYear={lineChartYear}
        initialMonthIndex={lineChartMonthIndex}
      />

      <DatePickerModal
        isVisible={isBarChartModalVisible}
        onClose={() => setIsBarChartModalVisible(false)}
        onSelectDate={handleBarChartDateSelect}
        initialYear={barChartYear}
        initialMonthIndex={barChartMonthIndex}
      />

      <DatePickerModal
        isVisible={isPieChartModalVisible}
        onClose={() => setIsPieChartModalVisible(false)}
        onSelectDate={handlePieChartDateSelect}
        initialYear={pieChartYear}
        initialMonthIndex={pieChartMonthIndex}
      />

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

/* ──────────────────────────────────────────────────────────────
   STYLES
   ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fa' },
  contentContainer: { padding: 16 },
  sectionHeader: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 10 },
  cardsRow: { flexDirection: 'row', alignItems: 'center', gap: 40, paddingVertical: 5 },
  card: { width: 250, minHeight: 130, backgroundColor: 'white', borderRadius: 16, padding: 10,  shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  cardIcon: { marginBottom: 8, alignSelf: 'flex-start' },
  cardTitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 4 },
  cardDetail: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4, ...(Platform.OS === 'web' && { boxShadow: '0px 3px 8px rgba(0,0,0,0.15)' }) },
  datePickerText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  graphContainer: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6, ...(Platform.OS === 'web' && { boxShadow: '0px 4px 10px rgba(0,0,0,0.15), 0px 0px 4px rgba(0,0,0,0.05)' }) },
  graphTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  graphTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  datePickerButtonSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  datePickerTextSmall: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  graphBox: { backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 8, overflow: 'hidden' },
  graphLabel: { fontSize: 14, color: '#4b5563', textAlign: 'center', padding: 20 },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: -5, marginBottom: 10, gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendColor: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#333' },
  topRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  topRowMobile: { flexDirection: 'column', gap: 16, marginBottom: 24, width: '100%', alignItems: 'stretch' },
  leftColumn: { flex: 1, minWidth: 300, maxWidth: '35%', marginBottom: 24 },
  centerColumn: { flex: 1, minWidth: 300, maxWidth: '35%', marginBottom: 24 },
  rightColumn: { flex: 1, minWidth: 300, maxWidth: '30%', marginBottom: 24 },
  leftColumnMobile: { width: '100%', marginBottom: 16 },
  centerColumnMobile: { width: '100%', marginBottom: 16 },
  rightColumnMobile: { width: '100%', marginBottom: 16 },
  bottomRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  bottomRowMobile: { flexDirection: 'column', gap: 16, marginBottom: 24, width: '100%', alignItems: 'stretch' },
  chartColumnNarrow: { flex: 1, minWidth: 300, maxWidth: '70%', marginBottom: 24 },
  chartColumnWide: { flex: 1, minWidth: 300, maxWidth: '30%', marginBottom: 24 },
  chartColumnFull: { width: '100%', marginBottom: 16 },
  cardWrapperMobile: { width: '100%', minHeight: 420 },
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
    minHeight: 390,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  cardWrapper: { flex: 1, justifyContent: 'space-between', minHeight: 420 },
  insightWrapper: { flex: 1, minHeight: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  analysisCardTitleBig: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 2 },
  analysisCardSubtitle: { fontSize: 15, color: '#6b7280' },
  yearLevelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 6 },
  yearLevelIconContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  yearLevelContent: { flex: 1, paddingLeft: 4 },
  yearLevelLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  yearLevelText: { fontSize: 15, color: '#6b7280', marginBottom: 4 },
  yearLevelProjection: { fontSize: 11, color: '#1f2937', fontWeight: '600' },
  barChartContainer: { width: 70, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginRight: 10 },
  barChartBar: { height: '100%', borderRadius: 4 },
  trendBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, alignSelf: 'center', width: 68, alignItems: 'center' },
  trendText: { fontSize: 14, fontWeight: '600' },
  keyInsightBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  keyInsightLabel: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  keyInsightText: { fontSize: 14, color: '#4b5563', lineHeight: 20, flexShrink: 1 },
  departmentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  rankBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#6b7280', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rankBadgeFirst: { backgroundColor: '#10b981' },
  rankText: { fontSize: 11, fontWeight: 'bold', color: 'white' },
  rankTextFirst: { color: 'white' },
  departmentContent: { flex: 1 },
  departmentName: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 3 },
  departmentDetail: { fontSize: 11, color: '#6b7280' },
  consistencyBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start', marginTop: 2 },
  consistencyText: { fontSize: 10, fontWeight: '600', color: '#ffffff' },
  percentageText: { fontSize: 12, fontWeight: '600', color: '#333', marginLeft: 8 },
  summaryBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    minHeight: 150,
  },
  summaryText: { fontSize: 14, color: '#166534', lineHeight: 20, flexShrink: 1, padding: 10 },
});

export default Dashboard;