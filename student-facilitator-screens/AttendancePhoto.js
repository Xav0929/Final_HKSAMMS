import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";

/* ────────────────────── RESPONSIVE COLUMN WIDTHS ────────────────────── */
const COLUMN_WIDTHS = {
  photo: 130,
  time: 240,
  studentId: 140,
  status: 140,
  location: 220,
};

const API_BASE_URL = "http://192.168.1.9:8000";

const extractBase64Payload = (value = "") => {
  const parts = value.split(",");
  return parts.length > 1 ? parts.pop() || "" : "";
};

const readBlobUrlAsBase64 = async (uri) => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Failed to read captured photo data. Please try again.");
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not process captured photo. Please retake your photo."));
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? extractBase64Payload(reader.result) : "";
      if (result) resolve(result);
      else reject(new Error("Captured photo is missing image data. Please retake your photo."));
    };
    reader.readAsDataURL(blob);
  });
};

const ensurePhotoBase64 = async (photo) => {
  if (!photo) throw new Error("No photo data was captured.");

  if (photo.base64) {
    return photo.base64;
  }

  const uri = photo.uri || "";

  if (uri.startsWith("data:")) {
    const payload = extractBase64Payload(uri);
    if (payload) return payload;
  }

  if (uri.startsWith("blob:")) {
    return readBlobUrlAsBase64(uri);
  }

  if (Platform.OS === "web") {
    if (!uri) {
      throw new Error("Unable to access the captured photo. Please ensure camera permissions are granted and try again.");
    }
    return readBlobUrlAsBase64(uri);
  }

  if (uri) {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      console.warn("AttendancePhoto readAsStringAsync failed:", error);
    }
  }

  throw new Error("Unable to process the captured photo. Please retake your photo and try again.");
};

const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
  if (typeof globalThis.atob !== 'function') {
    throw new Error('Base64 decoding is not supported in this environment.');
  }

  if (!base64) {
    throw new Error('Captured photo is missing image data. Please retake your photo.');
  }

  let cleaned = base64.trim().replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  const remainder = cleaned.length % 4;
  if (remainder) {
    cleaned = cleaned.padEnd(cleaned.length + (4 - remainder), '=');
  }

  let binaryString;
  try {
    binaryString = globalThis.atob(cleaned);
  } catch (error) {
    console.warn('AttendancePhoto base64 decode failed:', error);
    throw new Error('Captured photo data could not be decoded. Please retake your photo.');
  }

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const buildPhotoUploadFormData = async ({ photo, base64, studentProfile, location }) => {
  const formData = new FormData();
  const fileName = `photo-${studentProfile.id || 'student'}-${Date.now()}.jpg`;
  const mimeType = 'image/jpeg';

  if (Platform.OS === 'web') {
    const blob = base64ToBlob(base64, mimeType);
    formData.append('photo', blob, fileName);
  } else {
    let uri = photo?.uri;
    if (!uri) {
      const tempUri = `${FileSystem.cacheDirectory || ''}photo-${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      uri = tempUri;
    }

    formData.append('photo', {
      uri,
      name: fileName,
      type: mimeType,
    });
  }

  formData.append('studentId', studentProfile.id);
  formData.append('studentName', studentProfile.name || studentProfile.id);
  formData.append('location', location);
  formData.append('scheduleDate', new Date().toISOString());

  return formData;
};

const resolvePhotoUri = (record) => {
  if (!record) return '';
  if (record.photoUrl) return record.photoUrl;
  if (record.photoId) return `${API_BASE_URL}/api/faci-attendance/photo/${record.photoId}`;
  return '';
};

const fetchJson = async (url, options = {}, { suppressErrorLog = false } = {}) => {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const rawText = await response.text();
  let data = null;

  if (isJson && rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      if (!suppressErrorLog) {
        console.warn(`[AttendancePhoto] Invalid JSON from ${url}:`, rawText.slice(0, 120));
      }
      throw new Error("Received malformed data from server.");
    }
  }

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error("Photo upload is too large. Please retake with a smaller size.");
    }

    if (!suppressErrorLog && rawText) {
      console.warn(`[AttendancePhoto] Non-JSON response from ${url}:`, rawText.slice(0, 120));
    }

    const message = (isJson && data?.message) || response.statusText || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (isJson) return data;

  return rawText ? { data: rawText } : null;
};

export default function AttendancePhoto() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isMobile = width < 768;

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoLocation, setPhotoLocation] = useState('');
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [studentProfile, setStudentProfile] = useState({ id: "", name: "" });

  const openCameraModal = () => {
    setPhotoLocation('');
    setIsCameraOpen(true);
  };

  const closeCameraModal = () => {
    setIsCameraOpen(false);
    setPhotoLocation('');
  };

  useEffect(() => {
    (async () => {
      try {
        const [username, token] = await Promise.all([
          AsyncStorage.getItem("username"),
          AsyncStorage.getItem("token"),
        ]);

        if (!username) return;

        setStudentProfile((prev) => ({ ...prev, id: username }));

        try {
          const duties = await fetchJson(
            `${API_BASE_URL}/api/duties?id=${encodeURIComponent(username)}`,
            token
              ? {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              : undefined,
            { suppressErrorLog: true }
          );

          const match = Array.isArray(duties)
            ? duties.find((duty) => duty.id === username)
            : null;
          if (match?.name) {
            setStudentProfile({ id: username, name: match.name });
            return;
          }
        } catch (err) {
          console.warn('AttendancePhoto duties lookup failed:', err.message);
        }

        try {
          const scholars = await fetchJson(
            `${API_BASE_URL}/api/scholars`,
            undefined,
            { suppressErrorLog: true }
          );
          const match = Array.isArray(scholars)
            ? scholars.find((scholar) => scholar.id === username)
            : null;
          if (match?.name) {
            setStudentProfile({ id: username, name: match.name });
          }
        } catch (err) {
          console.warn('AttendancePhoto scholar lookup failed:', err.message);
        }
      } catch (err) {
        console.warn('AttendancePhoto profile bootstrap error:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!studentProfile.id) return;

    (async () => {
      try {
        const startDate = moment().subtract(6, 'days').format('YYYY-MM-DD');
        const data = await fetchJson(
          `${API_BASE_URL}/api/faci-attendance?studentId=${encodeURIComponent(
            studentProfile.id
          )}&startDate=${startDate}`,
          undefined,
          { suppressErrorLog: true }
        );

        if (!Array.isArray(data)) return;

        const mapped = data
          .map((record) => {
            const timeLabel = record.checkInTime
              ? moment(record.checkInTime).format('MMM D, YYYY h:mm A')
              : moment(record.scheduleDate).format('MMM D, YYYY');

            return {
              id: record._id || `${record.studentId}-${record.scheduleDate}`,
              uri: resolvePhotoUri(record),
              photoId: record.photoId || null,
              time: timeLabel,
              status: record.status || 'Pending',
              scheduleDate: record.scheduleDate,
              studentId: record.studentId || studentProfile.id || 'N/A',
              location: record.location || 'N/A',
            };
          })
          .sort((a, b) => {
            const dateA = a.scheduleDate || a.time;
            const dateB = b.scheduleDate || b.time;
            return new Date(dateB) - new Date(dateA);
          });

        setRecords(mapped);
        setApiError(null);
      } catch (err) {
        console.warn('AttendancePhoto history fetch failed:', err.message);
        setApiError(err.message);
      }
    })();
  }, [studentProfile.id]);

  if (!permission) return <View style={styles.center} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.message}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => setFacing((c) => (c === "back" ? "front" : "back"));

  const submitPhotoAttendance = async (photo) => {
    if (!studentProfile.id) {
      Alert.alert('Missing Information', 'Your account could not be identified. Please log in again.');
      return;
    }

    setSaving(true);
    setApiError(null);

    const locationValue = photoLocation.trim();
    if (!locationValue) {
      setSaving(false);
      Alert.alert('Missing Location', 'Please enter your current location before submitting.');
      return;
    }

    let rawBase64;
    try {
      rawBase64 = await ensurePhotoBase64(photo);
    } catch (error) {
      setSaving(false);
      setApiError(error.message);
      Alert.alert('Attendance Failed', error.message);
      return;
    }

    let formData;
    try {
      formData = await buildPhotoUploadFormData({
        photo,
        base64: rawBase64,
        studentProfile,
        location: locationValue,
      });
    } catch (error) {
      setSaving(false);
      setApiError(error.message);
      Alert.alert('Attendance Failed', error.message);
      return;
    }

    try {
      const result = await fetchJson(
        `${API_BASE_URL}/api/faci-attendance/photo`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const displayTime = result.checkInTime
        ? moment(result.checkInTime).format('MMM D, YYYY h:mm A')
        : new Date().toLocaleString();

      const record = {
        id: result._id || Date.now().toString(),
        uri: `data:image/jpeg;base64,${rawBase64}`,
        photoId: result.photoId || null,
        time: displayTime,
        status: result.status || 'Present',
        scheduleDate: result.scheduleDate,
        studentId: studentProfile.id,
        location: result.location || locationValue,
      };

      setRecords((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
      closeCameraModal();
    } catch (error) {
      setApiError(error.message);
      Alert.alert('Attendance Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || saving) return;
    if (!photoLocation.trim()) {
      Alert.alert('Missing Location', 'Please enter your current location before capturing a photo.');
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4, base64: true, skipProcessing: true });
      if (!photo?.uri) return;

      await submitPhotoAttendance({
        uri: photo.uri,
        base64: photo.base64,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Capture Error', 'Unable to capture photo. Please try again.');
    }
  };

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const toLower = (value) => (value ? String(value).toLowerCase() : '');
    return (
      toLower(r.time).includes(q) ||
      toLower(r.status).includes(q) ||
      toLower(r.studentId).includes(q) ||
      toLower(r.location).includes(q)
    );
  });

  const locationReady = photoLocation.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header (search + camera button) ── */}
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search time, status, ID, location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.smallCameraBtn, saving && { opacity: 0.6 }]}
          onPress={openCameraModal}
          disabled={saving}
        >
          <Text style={styles.smallCameraText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {apiError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      )}

      {/* ── MAIN CONTENT ── */}
      <View style={styles.contentContainer}>
        {isMobile ? (
          /* ── MOBILE: CARDS ── */
          <ScrollView
            contentContainerStyle={styles.mobileScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredRecords.length === 0 ? (
              <Text style={styles.emptyText}>No records found.</Text>
            ) : (
              filteredRecords.map((item) => (
                <View key={item.id} style={styles.card}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRecord(item);
                      setIsImageViewOpen(true);
                    }}
                    style={styles.cardImageWrapper}
                  >
                    {item.uri ? (
                      <Image source={{ uri: item.uri }} style={styles.cardImage} />
                    ) : (
                      <View style={styles.missingPhoto}>
                        <Text style={styles.missingPhotoText}>No Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.cardBody}>
                    <View style={styles.cardField}>
                      <Text style={styles.cardLabel}>Time</Text>
                      <Text style={styles.cardValue}>{item.time}</Text>
                    </View>
                    <View style={styles.cardField}>
                      <Text style={styles.cardLabel}>Status</Text>
                      <Text
                        style={[
                          styles.cardValue,
                          item.status === 'Present' ? styles.statusPresent : styles.statusAbsent,
                        ]}
                      >
                        {item.status || 'Pending'}
                      </Text>
                    </View>
                    <View style={styles.cardField}>
                      <Text style={styles.cardLabel}>Location</Text>
                      <Text style={styles.cardValue}>{item.location || 'N/A'}</Text>
                    </View>
                    <View style={styles.cardField}>
                      <Text style={styles.cardLabel}>Student ID</Text>
                      <Text style={styles.cardValue}>{item.studentId}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          /* ── WEB: TABLE ── */
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={isWeb}
            style={styles.webHorizontalScroll}
          >
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={[styles.th, { width: COLUMN_WIDTHS.photo }]}>
                  <Text style={styles.thText}>Photo</Text>
                </View>
                <View style={[styles.th, { width: COLUMN_WIDTHS.time }]}>
                  <Text style={styles.thText}>Time</Text>
                </View>
                <View style={[styles.th, { width: COLUMN_WIDTHS.studentId }]}>
                  <Text style={styles.thText}>Student ID</Text>
                </View>
                <View style={[styles.th, { width: COLUMN_WIDTHS.status }]}>
                  <Text style={styles.thText}>Status</Text>
                </View>
                <View style={[styles.th, { width: COLUMN_WIDTHS.location }]}>
                  <Text style={styles.thText}>Location</Text>
                </View>
              </View>

              <ScrollView style={styles.webBodyScroll}>
                {filteredRecords.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No records found.</Text>
                  </View>
                ) : (
                  filteredRecords.map((item) => (
                    <View key={item.id} style={styles.tr}>
                      <View style={[styles.td, { width: COLUMN_WIDTHS.photo }]}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedRecord(item);
                            setIsImageViewOpen(true);
                          }}
                        >
                          {item.uri ? (
                            <Image source={{ uri: item.uri }} style={styles.tableImage} />
                          ) : (
                            <View style={styles.tableImagePlaceholder}>
                              <Text style={styles.missingPhotoText}>No Photo</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.td, { width: COLUMN_WIDTHS.time }]}>
                        <Text style={styles.tdText} numberOfLines={2}>
                          {item.time}
                        </Text>
                      </View>

                      <View style={[styles.td, { width: COLUMN_WIDTHS.studentId }]}>
                        <Text style={styles.tdText}>{item.studentId}</Text>
                      </View>

                      <View style={[styles.td, { width: COLUMN_WIDTHS.status }]}>
                        <Text
                          style={[
                            styles.statusText,
                            item.status === 'Present' ? styles.statusPresent : styles.statusAbsent,
                          ]}
                        >
                          {item.status || 'Pending'}
                        </Text>
                      </View>

                      <View style={[styles.td, { width: COLUMN_WIDTHS.location }]}>
                        <Text style={styles.tdText} numberOfLines={2}>
                          {item.location || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>

      {/* ── Camera Modal ── */}
      <Modal visible={isCameraOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
          <View style={styles.locationInputContainer} pointerEvents="box-none">
            <View style={styles.locationInputInner}>
              <Text style={styles.locationLabel}>Location (required)</Text>
              <TextInput
                style={styles.locationInput}
                placeholder="Enter your current location"
                placeholderTextColor="#d1d5db"
                value={photoLocation}
                onChangeText={setPhotoLocation}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.captureBtn, (saving || !locationReady) && { opacity: 0.6 }]}
              onPress={capturePhoto}
              disabled={saving || !locationReady}
            >
              <Text style={styles.captureText}>{saving ? 'Saving...' : 'Capture'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraFacing}>
              <Text style={styles.flipText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.flipBtn, { backgroundColor: "#E53935" }]}
              onPress={closeCameraModal}
            >
              <Text style={styles.flipText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Image Viewer Modal ── */}
      <Modal visible={isImageViewOpen} transparent animationType="fade">
        <View style={styles.imageViewContainer}>
          <TouchableOpacity style={styles.closeImageBtn} onPress={() => setIsImageViewOpen(false)}>
            <Text style={{ color: "#fff", fontSize: 24 }}>×</Text>
          </TouchableOpacity>
          {selectedRecord && (
            <View style={styles.fullImageWrapper}>
              {selectedRecord.uri ? (
                <Image source={{ uri: selectedRecord.uri }} style={styles.fullImage} resizeMode="contain" />
              ) : (
                <View style={[styles.fullImage, styles.fullImagePlaceholder]}>
                  <Text style={styles.missingPhotoText}>No Photo Available</Text>
                </View>
              )}
              <View style={styles.overlayBox}>
                <Text style={styles.overlayText}>Time: {selectedRecord.time}</Text>
                <Text style={styles.overlayText}>Student ID: {selectedRecord.studentId}</Text>
                <Text style={styles.overlayText}>Location: {selectedRecord.location || 'N/A'}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ────────────────────── STYLES ────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9fb" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f8f8f8",
    fontSize: 15,
    marginRight: 10,
  },
  smallCameraBtn: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  smallCameraText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  errorText: { color: "#b91c1c", fontSize: 13, textAlign: "center" },
  contentContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  /* Mobile Cards */
  mobileScrollContent: { paddingBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImageWrapper: { width: "100%" },
  cardImage: { width: "100%", height: 180 },
  missingPhoto: {
    width: "100%",
    height: 180,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  missingPhotoText: { color: "#6b7280", fontSize: 12 },
  cardBody: { padding: 16 },
  cardField: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    minWidth: 80,
  },
  cardValue: {
    fontSize: 13,
    color: "#333",
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  },

  /* Web Table */
  webHorizontalScroll: { flex: 1 },
  table: {
    minWidth: 1180,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f2f5",
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  th: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  thText: { fontSize: 14, fontWeight: "bold", color: "#333", textAlign: "center" },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    minHeight: 84,
  },
  td: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tdText: { fontSize: 13.5, color: "#444", textAlign: "center", lineHeight: 18 },
  statusText: { fontSize: 13, fontWeight: "600" },
  statusPresent: { color: "#10B981" },
  statusAbsent: { color: "#EF4444" },
  tableImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  tableImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  webBodyScroll: { flex: 1 },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 16, color: "#888" },
  emptyRow: { paddingVertical: 40, alignItems: "center" },

  /* Camera & Image Viewer */
  modalContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  locationInputContainer: {
    position: "absolute",
    top: Platform.OS === "web" ? 24 : 56,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  locationInputInner: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(17,17,17,0.75)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  locationLabel: {
    color: "#f3f4f6",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  locationInput: {
    backgroundColor: "rgba(31,31,31,0.65)",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  captureBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  captureText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  flipBtn: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  flipText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  imageViewContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImageWrapper: {
    width: "92%",
    maxWidth: 500,
    height: "75%",
    backgroundColor: "#111",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  fullImage: { width: "100%", height: "100%" },
  fullImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
  },
  overlayBox: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
  },
  overlayText: { color: "#fff", fontSize: 13, lineHeight: 18 },
  closeImageBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  message: { textAlign: "center", fontSize: 16, marginBottom: 16, color: "#555" },
});