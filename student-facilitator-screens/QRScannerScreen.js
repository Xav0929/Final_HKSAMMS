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
import QRCheckIn from "./QRCheckIn";

const API_URL = "https://final-hksamms.onrender.com/api/faci-attendance";
const PRIMARY_COLOR = "#00A4DF";
const SCAN_COOLDOWN = 10000;
const DEBOUNCE_DELAY = 500;

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
  const lastProcessTimeRef = useRef(0);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // === Shared QR Processing ===
  const processQRData = async (data) => {
    const now = Date.now();
    if (isScanLocked || isSaving || now - lastProcessTimeRef.current < DEBOUNCE_DELAY) return;

    console.log("Raw QR data:", data);
    lastProcessTimeRef.current = now;
    setIsScanLocked(true);
    setIsSaving(true);

    try {
      const parsed = JSON.parse(data);
      setScannedData(parsed);

      const checkRecord = {
        studentId: parsed.studentId || `NO-ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
        Alert.alert("Attendance Recorded", `${checkRecord.studentName} marked for check.`);
      } else {
        Alert.alert("Failed", result.message || "Something went wrong");
      }
    } catch (error) {
      console.error("QR parse error:", error);
      Alert.alert("Invalid QR", "This QR code is not valid or unreadable.");
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setIsScanLocked(false);
        setScannedData(null);
        lastProcessTimeRef.current = 0;
      }, SCAN_COOLDOWN);
    }
  };

  // === MOBILE: Expo Camera Handler ===
  const handleMobileScan = ({ data }) => processQRData(data);

  // === WEB: qr-scanner Setup ===
  useEffect(() => {
    if (Platform.OS !== "web" || !videoRef.current || isScanLocked || isSaving) return;

    let scanner = null;
    let stream = null;

    const startScanner = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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
        console.error("Web QR Scanner Error:", err);
        Alert.alert("Camera Error", "Unable to access camera on web.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isScanLocked, isSaving]);

  // === Permission Denied ===
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
            style={styles.webVideo}
            playsInline
            muted
          />
          <View style={styles.scanFrame} />
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
          <>
            <QRCheckIn scannedData={scannedData} />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: PRIMARY_COLOR, margin: 15 }]}
              onPress={() => !isScanLocked && setScannedData(null)}
              disabled={isScanLocked}
            >
              <Text style={{ color: "white" }}>
                {isScanLocked ? "Locked (Wait 10s)" : "Scan Again"}
              </Text>
            </TouchableOpacity>
          </>
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
        <>
          <QRCheckIn scannedData={scannedData} />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: PRIMARY_COLOR, marginTop: 15, marginHorizontal: 15 }]}
            onPress={() => !isScanLocked && setScannedData(null)}
            disabled={isScanLocked}
          >
            <Text style={{ color: "white" }}>
              {isScanLocked ? "Locked (Wait 10s)" : "Scan Again"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },

  // Web
  webCameraContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  webVideo: {
    width: "100%",
    maxWidth: 500,
    height: 500,
    borderRadius: 12,
    backgroundColor: "#000",
  },
  scanFrame: {
    position: "absolute",
    top: 100,
    left: 50,
    right: 50,
    bottom: 200,
    borderWidth: 3,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
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
    paddingVertical: 10,
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
});