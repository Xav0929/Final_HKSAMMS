// AttendancePhoto.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  SafeAreaView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLUMN_WIDTHS = {
  photo: 130,
  time: 240,
  location: 220,
  address: 450,
  studentId: 140,
};

// ADD YOUR GOOGLE API KEY HERE (FREE)
const GOOGLE_API_KEY = "YAIzaSyDbgCSxJuKZYj2TfJNG5umvQSNo0Idre7k"; // ← GET FROM: https://console.cloud.google.com/

export default function AttendancePhoto() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isMobile = width < 768;

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("Getting address...");
  const [records, setRecords] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentId, setStudentId] = useState("");

  const API_URL = "http://192.168.86.39:8000";

  // FETCH STUDENT ID
  const loadStudentId = async () => {
    try {
      const username = await AsyncStorage.getItem("username");
      const token = await AsyncStorage.getItem("token");
      if (!username || !token) return;

      const res = await fetch(`${API_URL}/api/scholars/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.exists && data.scholar?.id) {
        setStudentId(data.scholar.id);
      }
    } catch (e) {
      console.warn("ID load error:", e);
    }
  };

  // FETCH RECORDS
  const loadRecords = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/selfAttendance/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const { records } = await res.json();

      const formatted = records.map((r) => ({
        id: r._id,
        uri: r.photoUrl.startsWith("http") ? r.photoUrl : `${API_URL}${r.photoUrl}`,
        time: r.time,
        latitude: r.latitude?.toFixed(4) || "N/A",
        longitude: r.longitude?.toFixed(4) || "N/A",
        address: r.address || "N/A",
        studentId: studentId || "N/A",
      }));

      setRecords(formatted);
    } catch (e) {
      console.error("Load failed:", e);
    }
  };

  // GOOGLE GEOCODE (BEST)
  const getAddressFromGoogle = async (lat, lng) => {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
      console.log("No Google key → using Expo fallback");
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results[0]) {
        const addr = data.results[0].formatted_address;
        console.log("Google Address:", addr);
        return addr;
      }
    } catch (e) {
      console.warn("Google Geocode failed:", e);
    }
    return null;
  };

  // EXPO FALLBACK (RETRY 3 TIMES)
  const getAddressFromExpo = async (lat, lng) => {
    for (let i = 0; i < 3; i++) {
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo.length > 0) {
          const g = geo[0];
          const addr = [g.name, g.street, g.city, g.region, g.country]
            .filter(Boolean)
            .join(", ");
          if (addr.trim()) {
            console.log("Expo Address:", addr);
            return addr;
          }
        }
      } catch (e) {
        console.warn(`Expo attempt ${i + 1} failed:`, e);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    return null;
  };

  // FINAL ADDRESS
  const getFinalAddress = async (lat, lng) => {
    let addr = await getAddressFromGoogle(lat, lng);
    if (addr) return addr;

    addr = await getAddressFromExpo(lat, lng);
    if (addr) return addr;

    return `Tarlac City, Tarlac, Philippines`; // Hardcoded fallback for your location
  };

  // GET LOCATION + ADDRESS
  useEffect(() => {
    (async () => {
      if (!permission) await requestPermission();

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setAddress("Location permission denied");
        setLoading(false);
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 20000,
        });
        setLocation(loc.coords);
        console.log("GPS:", loc.coords.latitude, loc.coords.longitude);

        const addr = await getFinalAddress(loc.coords.latitude, loc.coords.longitude);
        setAddress(addr);
      } catch (e) {
        console.error("Location failed:", e);
        setAddress("Location unavailable");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // LOAD ON START
  useEffect(() => {
    loadStudentId().then(() => {
      loadRecords();
    });
  }, []);

  if (!permission?.granted) {
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
        <Text style={{ marginTop: 8 }}>Getting address…</Text>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => setFacing((c) => (c === "back" ? "front" : "back"));

  // CAPTURE & UPLOAD
  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: false,
      });

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alert("Login required");
        return;
      }

      const formData = new FormData();

      if (Platform.OS === "web") {
        const blobRes = await fetch(photo.uri);
        const blob = await blobRes.blob();
        formData.append("photo", blob, `selfie_${Date.now()}.jpg`);
      } else {
        formData.append("photo", {
          uri: photo.uri,
          type: "image/jpeg",
          name: `selfie_${Date.now()}.jpg`,
        });
      }

      formData.append("time", new Date().toLocaleString());
      formData.append("latitude", location?.latitude?.toString() || "");
      formData.append("longitude", location?.longitude?.toString() || "");
      formData.append("address", address);

      const res = await fetch(`${API_URL}/api/selfAttendance/add`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        alert("Attendance recorded!");
        setTimeout(loadRecords, 1200);
      } else {
        alert(data.message || "Upload failed");
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setIsCameraOpen(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      r.time.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.latitude.includes(q) ||
      r.longitude.includes(q) ||
      r.studentId.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search time, address, coords, ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.smallCameraBtn} onPress={() => setIsCameraOpen(true)}>
          <Text style={styles.smallCameraText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {/* DEBUG (REMOVE IN PRODUCTION) */}
      {__DEV__ && (
        <View style={{ padding: 10, backgroundColor: "#fff", margin: 10, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: "#666" }}>Current Address: {address}</Text>
        </View>
      )}

      <View style={styles.contentContainer}>
        {isMobile ? (
          <ScrollView contentContainerStyle={styles.mobileScrollContent}>
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
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.cardImage}
                      resizeMode="cover"
                      onError={(e) => console.log("IMG ERR:", e.nativeEvent.error)}
                    />
                  </TouchableOpacity>

                  <View style={styles.cardBody}>
                    <View style={styles.cardField}>
                      <Text style={styles.cardLabel}>Time</Text>
                      <Text style={styles.cardValue}>{item.time}</Text>
                    </View>
                    <View style={styles.cardField}>
                      <Text style={styles.cardLabel}>Location</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`)}
                      >
                        <Text style={[styles.cardValue, styles.linkText]}>
                          {item.latitude}, {item.longitude}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardField}>
                      <Text style={styles.cardLabel}>Address</Text>
                      <Text style={styles.cardValue} numberOfLines={2}>{item.address}</Text>
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
          // WEB TABLE (unchanged)
          <ScrollView horizontal style={styles.webHorizontalScroll}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={[styles.th, { width: COLUMN_WIDTHS.photo }]}>
                  <Text style={styles.thText}>Photo</Text>
                </View>
                <View style={[styles.th, { width: COLUMN_WIDTHS.time }]}>
                  <Text style={styles.thText}>Time</Text>
                </View>
                <View style={[styles.th, { width: COLUMN_WIDTHS.location }]}>
                  <Text style={styles.thText}>Location</Text>
                </View>
                <View style={[styles.th, { flex: 1, minWidth: COLUMN_WIDTHS.address }]}>
                  <Text style={styles.thText}>Address</Text>
                </View>
                <View style={[styles.th, { width: COLUMN_WIDTHS.studentId }]}>
                  <Text style={styles.thText}>Student ID</Text>
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
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.tableImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.td, { width: COLUMN_WIDTHS.time }]}>
                        <Text style={styles.tdText} numberOfLines={2}>{item.time}</Text>
                      </View>

                      <View style={[styles.td, { width: COLUMN_WIDTHS.location }]}>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`)}
                        >
                          <Text style={[styles.tdText, styles.linkText]} numberOfLines={1}>
                            {item.latitude}, {item.longitude}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.td, { flex: 1, minWidth: COLUMN_WIDTHS.address }]}>
                        <Text style={styles.tdText} numberOfLines={2}>{item.address}</Text>
                      </View>

                      <View style={[styles.td, { width: COLUMN_WIDTHS.studentId }]}>
                        <Text style={styles.tdText}>{item.studentId}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>

      {/* CAMERA MODAL */}
      <Modal visible={isCameraOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
          <View style={styles.controls}>
            <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
              <Text style={styles.captureText}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraFacing}>
              <Text style={styles.flipText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.flipBtn, { backgroundColor: "#E53935" }]}
              onPress={() => setIsCameraOpen(false)}
            >
              <Text style={styles.flipText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* IMAGE VIEW MODAL */}
      <Modal visible={isImageViewOpen} transparent animationType="fade">
        <View style={styles.imageViewContainer}>
          <TouchableOpacity style={styles.closeImageBtn} onPress={() => setIsImageViewOpen(false)}>
            <Text style={{ color: "#fff", fontSize: 24 }}>X</Text>
          </TouchableOpacity>
          {selectedRecord && (
            <View style={styles.fullImageWrapper}>
              <Image source={{ uri: selectedRecord.uri }} style={styles.fullImage} resizeMode="contain" />
              <View style={styles.overlayBox}>
                <Text style={styles.overlayText}>Time: {selectedRecord.time}</Text>
                <Text style={styles.overlayText}>Address: {selectedRecord.address}</Text>
                <Text style={styles.overlayText}>Lat: {selectedRecord.latitude} | Lng: {selectedRecord.longitude}</Text>
                <Text style={styles.overlayText}>ID: {selectedRecord.studentId}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// STYLES (unchanged)
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
  contentContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
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
  cardBody: { padding: 16 },
  cardField: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardLabel: { fontSize: 13, color: "#666", fontWeight: "600", minWidth: 80 },
  cardValue: { fontSize: 13, color: "#333", flex: 1, textAlign: "right", marginLeft: 12 },
  webHorizontalScroll: { flex: 1 },
  table: {
    minWidth: 960,
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
  th: { paddingVertical: 18, paddingHorizontal: 18, justifyContent: "center", alignItems: "center" },
  thText: { fontSize: 14, fontWeight: "bold", color: "#333", textAlign: "center" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", minHeight: 84 },
  td: { paddingHorizontal: 18, paddingVertical: 14, justifyContent: "center", alignItems: "center" },
  tdText: { fontSize: 13.5, color: "#444", textAlign: "center", lineHeight: 18 },
  tableImage: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
  webBodyScroll: { flex: 1 },
  linkText: { color: "#1a73e8", textDecorationLine: "underline" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 16, color: "#888" },
  emptyRow: { paddingVertical: 40, alignItems: "center" },
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
  captureBtn: { backgroundColor: "#4CAF50", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30 },
  captureText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  flipBtn: { backgroundColor: "#2196F3", paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30 },
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
  button: { backgroundColor: "#1a73e8", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});