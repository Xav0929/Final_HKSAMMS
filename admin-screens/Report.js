import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import moment from 'moment';
import { API_BASE_URL } from '../config/api';

// ──────────────────────────────────────────────────────────────
//  REPORT TABLE COMPONENT
// ──────────────────────────────────────────────────────────────
const ReportTable = ({ 
  title, 
  data, 
  columns, 
  searchQuery, 
  onSearchChange, 
  onExport 
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 5;
  const COL_WIDTH = 140;
  const TOTAL_COLS = columns.length;
  const TABLE_MIN_WIDTH = Math.max(TOTAL_COLS * COL_WIDTH, screenWidth - 32);

  // Filter data based on search query
  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return columns.some((col) => {
      const value = item[col.key];
      return value && String(value).toLowerCase().includes(query);
    });
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePhotoPress = (photoUrl) => {
    if (photoUrl) {
      setSelectedPhoto(photoUrl);
      setPhotoModalVisible(true);
    }
  };

  const Cell = ({ children, style = {}, isPhoto = false, photoUrl = null, isLastCell = false }) => {
    const cellStyle = [
      styles.cell, 
      { width: COL_WIDTH, minWidth: COL_WIDTH }, 
      isLastCell && styles.lastCell,
      style
    ];

    if (isPhoto) {
      if (photoUrl) {
        return (
          <View style={cellStyle}>
            <TouchableOpacity 
              onPress={() => handlePhotoPress(photoUrl)}
              style={styles.photoThumbnail}
              activeOpacity={0.7}
            >
              <Image 
                source={{ uri: photoUrl }} 
                style={styles.thumbnailImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Error loading thumbnail:', error);
                }}
              />
              <View style={styles.photoOverlay}>
                <Ionicons name="eye-outline" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        );
      } else {
        return (
          <View style={cellStyle}>
            <Text style={styles.cellText} numberOfLines={2}>
              No Photo
            </Text>
          </View>
        );
      }
    }
    return (
      <View style={cellStyle}>
        <Text style={styles.cellText} numberOfLines={2}>
          {children || '—'}
        </Text>
      </View>
    );
  };

  const Header = () => (
    <View style={styles.headerRow}>
      {columns.map((col, idx) => (
        <View 
          key={idx} 
          style={[
            styles.cell, 
            styles.header, 
            { width: COL_WIDTH, minWidth: COL_WIDTH },
            idx === columns.length - 1 && styles.lastCell
          ]}
        >
          <Text style={styles.headerText}>{col.label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableTitle}>{title}</Text>
        <Text style={styles.tableCount}>
          {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
          {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.exportButton} onPress={onExport}>
          <Ionicons name="print-outline" size={18} color="#fff" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={styles.tableWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.tableScrollView}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.table}>
            <Header />
            <ScrollView style={styles.tableBody}>
            {paginatedData.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No records found</Text>
              </View>
            ) : (
              paginatedData.map((item, idx) => (
                <View key={item._id || idx} style={styles.row}>
                  {columns.map((col, colIdx) => {
                    const isPhoto = col.isPhoto || false;
                    let photoUrl = null;
                    if (isPhoto && item[col.key]) {
                      // Construct the image URL from GridFS using photoId
                      photoUrl = `${API_BASE_URL}/api/faci-attendance/photo/${item[col.key]}`;
                    }
                    const isLastCell = colIdx === columns.length - 1;
                    return (
                      <Cell 
                        key={colIdx}
                        isPhoto={isPhoto}
                        photoUrl={photoUrl}
                        isLastCell={isLastCell}
                      >
                        {col.render ? col.render(item) : item[col.key]}
                      </Cell>
                    );
                  })}
                </View>
              ))
            )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back-outline" size={20} color={currentPage === 1 ? "#9ca3af" : "#60a5fa"} />
            <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <View style={styles.paginationInfo}>
            <Text style={styles.paginationInfoText}>
              Page {currentPage} of {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
              Next
            </Text>
            <Ionicons name="chevron-forward-outline" size={20} color={currentPage === totalPages ? "#9ca3af" : "#60a5fa"} />
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Modal */}
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity
            style={styles.photoModalBackdrop}
            onPress={() => setPhotoModalVisible(false)}
            activeOpacity={1}
          >
            <View style={styles.photoModalContent}>
              <TouchableOpacity
                style={styles.closePhotoButton}
                onPress={() => setPhotoModalVisible(false)}
              >
                <Ionicons name="close" size={30} color="#fff" />
              </TouchableOpacity>
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto }}
                  style={styles.fullPhoto}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Error loading full photo:', error);
                    Alert.alert('Error', 'Failed to load photo');
                    setPhotoModalVisible(false);
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────
//  MAIN REPORT COMPONENT
// ──────────────────────────────────────────────────────────────
export default function Report() {
  const [students, setStudents] = useState([]);
  const [facilitatorAttendances, setFacilitatorAttendances] = useState([]);
  const [checkerAttendances, setCheckerAttendances] = useState([]);
  
  const [studentSearch, setStudentSearch] = useState('');
  const [facilitatorSearch, setFacilitatorSearch] = useState('');
  const [checkerSearch, setCheckerSearch] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [studentsRes, faciRes, checkerRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/attendance`),
        fetch(`${API_BASE_URL}/api/faci-attendance`),
        fetch(`${API_BASE_URL}/api/checkerAttendance`),
      ]);

      if (!studentsRes.ok || !faciRes.ok || !checkerRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const studentsData = await studentsRes.json();
      const faciData = await faciRes.json();
      const checkerData = await checkerRes.json();

      // Calculate remaining hours for facilitators
      const semesterGoal = 70;
      const facilitatorPresentCount = new Map();
      faciData.forEach(att => {
        if (att.status === 'Present') {
          const count = facilitatorPresentCount.get(att.studentId) || 0;
          facilitatorPresentCount.set(att.studentId, count + 1);
        }
      });

      // Add remaining hours to facilitator records
      const faciDataWithHours = faciData.map(att => {
        const presentCount = facilitatorPresentCount.get(att.studentId) || 0;
        const remainingHours = Math.max(0, semesterGoal - (presentCount * 1.5));
        return { ...att, remainingHours, presentCount };
      });

      // Calculate remaining hours for checkers
      const checkerPresentCount = new Map();
      checkerData.forEach(att => {
        if (att.status === 'Present') {
          const count = checkerPresentCount.get(att.studentId) || 0;
          checkerPresentCount.set(att.studentId, count + 1);
        }
      });

      // Add remaining hours to checker records
      const checkerDataWithHours = checkerData.map(att => {
        const presentCount = checkerPresentCount.get(att.studentId) || 0;
        const remainingHours = Math.max(0, semesterGoal - (presentCount * 1.5));
        return { ...att, remainingHours, presentCount };
      });

      setStudents(studentsData);
      setFacilitatorAttendances(faciDataWithHours);
      setCheckerAttendances(checkerDataWithHours);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Unable to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  //  EXPORT FUNCTIONS
  // ──────────────────────────────────────────────────────────────
  const generateHTML = (title, data, columns) => {
    const tableRows = data.map((item) => {
      const cells = columns
        .map((col) => {
          const value = col.render ? col.render(item) : item[col.key];
          return `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${value || '—'}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const headerRow = columns
      .map((col) => `<th style="border: 1px solid #ddd; padding: 12px; background-color: #60a5fa; color: white; font-weight: bold; text-align: left;">${col.label}</th>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #60a5fa;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 20px;
              text-align: right;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p><strong>Generated:</strong> ${moment().format('MMMM DD, YYYY hh:mm A')}</p>
          <p><strong>Total Records:</strong> ${data.length}</p>
          <table>
            <thead>
              <tr>${headerRow}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            <p>HK-SAMMS Report | Generated on ${moment().format('MMMM DD, YYYY')}</p>
          </div>
        </body>
      </html>
    `;
  };

  const exportToPDF = async (title, data, columns) => {
    try {
      if (data.length === 0) {
        Alert.alert('Error', 'No data to export');
        return;
      }

      const html = generateHTML(title, data, columns);
      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export report');
    }
  };

  // ──────────────────────────────────────────────────────────────
  //  COLUMN DEFINITIONS
  // ──────────────────────────────────────────────────────────────
  const studentColumns = [
    { key: 'studentName', label: 'Student Name' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'yearLevel', label: 'Year Level' },
    { key: 'course', label: 'Course' },
    { key: 'dutyType', label: 'Duty Type' },
    { key: 'room', label: 'Room' },
    { 
      key: 'classStatus', 
      label: 'Class Status',
      render: (item) => item.classStatus || '—'
    },
    { 
      key: 'facilitatorStatus', 
      label: 'Facilitator Status',
      render: (item) => item.facilitatorStatus || '—'
    },
    { 
      key: 'encodedTime', 
      label: 'Encoded Time',
      render: (item) => item.encodedTime || '—'
    },
    {
      key: 'checkerId',
      label: 'Checker ID',
      render: (item) => item.checkerId || 'N/A'
    },
    {
      key: 'checkerName',
      label: 'Checker Name',
      render: (item) => item.checkerName || 'N/A'
    },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (item) => item.createdAt 
        ? moment(item.createdAt).format('MMM DD, YYYY hh:mm A')
        : '—'
    },
  ];

  const facilitatorColumns = [
    { key: 'studentName', label: 'Student Name' },
    { key: 'studentId', label: 'Student ID' },
    {
      key: 'scheduleDate',
      label: 'Schedule Date',
      render: (item) => item.scheduleDate
        ? moment(item.scheduleDate).format('MMM DD, YYYY')
        : '—'
    },
    {
      key: 'checkInTime',
      label: 'Check In Time',
      render: (item) => item.checkInTime
        ? moment(item.checkInTime).format('MMM DD, YYYY hh:mm A')
        : '—'
    },
    { key: 'location', label: 'Location' },
    { 
      key: 'status', 
      label: 'Status',
      render: (item) => item.status || 'Pending'
    },
    {
      key: 'photoId',
      label: 'Photo',
      isPhoto: true,
      render: (item) => item.photoId ? 'View Photo' : 'No Photo'
    },
    {
      key: 'remainingHours',
      label: 'Remaining Hours',
      render: (item) => {
        const remaining = item.remainingHours !== undefined ? item.remainingHours : 70;
        return `${remaining.toFixed(1)} hrs`;
      }
    },
    {
      key: 'checkerId',
      label: 'Checker ID',
      render: (item) => item.checkerId || 'N/A'
    },
    {
      key: 'checkerName',
      label: 'Checker Name',
      render: (item) => item.checkerName || 'N/A'
    },
    {
      key: 'verifiedAt',
      label: 'Verified At',
      render: (item) => item.verifiedAt
        ? moment(item.verifiedAt).format('MMM DD, YYYY hh:mm A')
        : '—'
    },
  ];

  const checkerColumns = [
    { key: 'studentName', label: 'Student Name' },
    { key: 'studentId', label: 'Student ID' },
    {
      key: 'checkInTime',
      label: 'Check In Time',
      render: (item) => item.checkInTime
        ? moment(item.checkInTime).format('MMM DD, YYYY hh:mm A')
        : '—'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (item) => item.status || 'Pending'
    },
    {
      key: 'remainingHours',
      label: 'Remaining Hours',
      render: (item) => {
        const remaining = item.remainingHours !== undefined ? item.remainingHours : 70;
        return `${remaining.toFixed(1)} hrs`;
      }
    },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (item) => item.createdAt
        ? moment(item.createdAt).format('MMM DD, YYYY hh:mm A')
        : '—'
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Student Report Table */}
      <ReportTable
        title="Student Report"
        data={students}
        columns={studentColumns}
        searchQuery={studentSearch}
        onSearchChange={setStudentSearch}
        onExport={() => {
          const filtered = students.filter((item) => {
            if (!studentSearch) return true;
            const query = studentSearch.toLowerCase();
            return studentColumns.some((col) => {
              const value = item[col.key];
              return value && String(value).toLowerCase().includes(query);
            });
          });
          exportToPDF('Student Report', filtered, studentColumns);
        }}
      />

      {/* Facilitator Attendance Report Table */}
      <ReportTable
        title="Facilitator Attendance Report"
        data={facilitatorAttendances}
        columns={facilitatorColumns}
        searchQuery={facilitatorSearch}
        onSearchChange={setFacilitatorSearch}
        onExport={() => {
          const filtered = facilitatorAttendances.filter((item) => {
            if (!facilitatorSearch) return true;
            const query = facilitatorSearch.toLowerCase();
            return facilitatorColumns.some((col) => {
              const value = item[col.key];
              return value && String(value).toLowerCase().includes(query);
            });
          });
          exportToPDF('Facilitator Attendance Report', filtered, facilitatorColumns);
        }}
      />

      {/* Attendance Checker Report Table */}
      <ReportTable
        title="Attendance Checker Report"
        data={checkerAttendances}
        columns={checkerColumns}
        searchQuery={checkerSearch}
        onSearchChange={setCheckerSearch}
        onExport={() => {
          const filtered = checkerAttendances.filter((item) => {
            if (!checkerSearch) return true;
            const query = checkerSearch.toLowerCase();
            return checkerColumns.some((col) => {
              const value = item[col.key];
              return value && String(value).toLowerCase().includes(query);
            });
          });
          exportToPDF('Attendance Checker Report', filtered, checkerColumns);
        }}
      />

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// ──────────────────────────────────────────────────────────────
//  STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  refreshButtonText: {
    marginLeft: 8,
    color: '#60a5fa',
    fontWeight: '600',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  tableCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#60a5fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  tableWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  tableScrollView: {
    maxHeight: 500,
    width: '100%',
  },
  tableScrollContent: {
    flexGrow: 1,
    minWidth: '100%',
  },
  table: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#60a5fa',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cell: {
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  header: {
    backgroundColor: '#60a5fa',
  },
  headerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  cellText: {
    fontSize: 12,
    color: '#333',
  },
  tableBody: {
    maxHeight: 400,
  },
  emptyRow: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f3f4f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closePhotoButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#60a5fa',
    backgroundColor: 'white',
  },
  paginationButtonDisabled: {
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  paginationButtonText: {
    marginHorizontal: 6,
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: 14,
  },
  paginationButtonTextDisabled: {
    color: '#9ca3af',
  },
  paginationInfo: {
    flex: 1,
    alignItems: 'center',
  },
  paginationInfoText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});

