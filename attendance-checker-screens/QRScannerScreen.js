import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

const API_URL = "https://final-hksamms.onrender.com/api/checkerAttendance";
const PRIMARY_COLOR = "#00A4DF";
const SCAN_COOLDOWN = 10000;

// Web-only import
let QrScanner;
if (Platform.OS === "web") {
  QrScanner = require("qr-scanner").default;
}

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanLocked, setIsScanLocked] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // Shared QR processing
  const processQRData = async (data) => {
    if (isScanLocked || isSaving) return;

    console.log("Raw QR data:", data);
    setIsScanLocked(true);
    setIsSaving(true);

    try {
      const parsed = JSON.parse(data);
      setScannedData(parsed);

      const checkRecord = {
        studentId: parsed.studentId || `NO-ID-${Date.now()}-${Math.random() * 1000}`,
        studentName: parsed.studentName || "N/A",
        dutyType: parsed.dutyType || "N/A",
        checkInTime: new Date().toISOString(),
        location: parsed.location || "Room 101",
        status: "Present",
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkRecord),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("✅ Attendance Recorded", `${checkRecord.studentName} marked for check.`);
      } else {
        Alert.alert("❌ Failed", result.message || "Something went wrong");
      }
    } catch (error) {
      console.error("QR parse error:", error);
      Alert.alert("⚠️ Invalid QR", "This QR code is not valid or unreadable.");
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setIsScanLocked(false);
        setScannedData(null);
      }, SCAN_COOLDOWN);
    }
  };

  // === WEB: QR Scanner Setup ===
  useEffect(() => {
    if (Platform.OS !== "web" || !videoRef.current) return;

    let scanner = null;
    let stream = null;

    const startScanner = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        scanner = new QrScanner(videoRef.current, (result) => {
          processQRData(result.data);
        }, {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        });
        scannerRef.current = scanner;
        await scanner.start();
      } catch (err) {
        console.error("Web scanner error:", err);
      }
    };

    if (!isScanLocked && !isSaving) {
      startScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.clear();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanLocked, isSaving]);

  // === Mobile scan handler ===
  const handleMobileScan = ({ data }) => processQRData(data);

  // === Permission screen ===
  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 10 }}>We need your camera permission.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={{ color: "white" }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // === WEB RENDER ===
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <View style={styles.webCameraContainer}>
          <video
            ref={videoRef}
            style={styles.webCamera}
            playsInline
            muted
          />
          <View style={styles.webOverlay} />
        </View>

        <View style={styles.overlay}>
          <Text style={styles.scanText}>
            {isScanLocked || isSaving ? "Please wait 10 seconds..." : "Scan Scholar Duty QR"}
          </Text>
        </View>

        {isSaving && (
          <View style={styles.overlayCenter}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={{ color: PRIMARY_COLOR, marginTop: 10 }}>Saving...</Text>
          </View>
        )}

        {scannedData && !isSaving && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>✅ Scanned Successfully</Text>
            <Text style={styles.infoText}>ID: {scannedData.studentId}</Text>
            <Text style={styles.infoText}>Name: {scannedData.studentName}</Text>
            <Text style={styles.infoText}>Location: {scannedData.location}</Text>
            <Text style={styles.infoText}>Status: {scannedData.status}</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: PRIMARY_COLOR, marginTop: 15 }]}
              onPress={() => !isScanLocked && setScannedData(null)}
              disabled={isScanLocked}
            >
              <Text style={{ color: "white" }}>
                {isScanLocked ? "Locked (Wait 10s)" : "Scan Again"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // === MOBILE RENDER ===
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={isScanLocked || isSaving ? undefined : handleMobileScan}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      >
        <View style={styles.overlay}>
          <Text style={styles.scanText}>
            {isScanLocked || isSaving ? "Please wait 10 seconds..." : "Scan Scholar Duty QR"}
          </Text>
        </View>
      </CameraView>

      {isSaving && (
        <View style={styles.overlayCenter}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={{ color: PRIMARY_COLOR, marginTop: 10 }}>Saving...</Text>
        </View>
      )}

      {scannedData && !isSaving && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>✅ Scanned Successfully</Text>
          <Text style={styles.infoText}>ID: {scannedData.studentId}</Text>
          <Text style={styles.infoText}>Name: {scannedData.studentName}</Text>
          <Text style={styles.infoText}>Location: {scannedData.location}</Text>
          <Text style={styles.infoText}>Status: {scannedData.status}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: PRIMARY_COLOR, marginTop: 15 }]}
            onPress={() => !isScanLocked && setScannedData(null)}
            disabled={isScanLocked}
          >
            <Text style={{ color: "white" }}>
              {isScanLocked ? "Locked (Wait 10s)" : "Scan Again"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
  
  // Web styles
  webCameraContainer: { 
    flex: 1, 
    position: "relative",
    justifyContent: "center",
    alignItems: "center" 
  },
  webCamera: { 
    width: "100%", 
    height: "100%", 
    maxWidth: 500,
    maxHeight: 500,
    objectFit: "cover"
  },
  webOverlay: {
    position: "absolute",
    top: "25%",
    left: "25%",
    right: "25%",
    bottom: "25%",
    borderWidth: 2,
    borderColor: "#00A4DF",
    backgroundColor: "transparent",
  },
  
  overlay: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
  },
  overlayCenter: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanText: {
    color: "white",
    fontSize: 18,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  infoCard: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 6,
  },
});