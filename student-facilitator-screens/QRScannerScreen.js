import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCheckIn from "./QRCheckIn"; // Ensure path is correct

const API_URL = "https://final-hksamms.onrender.com/api/faci-attendance";
const PRIMARY_COLOR = "#00A4DF";
const SCAN_COOLDOWN = 10000; // 10 seconds in milliseconds
const DEBOUNCE_DELAY = 500; // 500ms debounce to handle iOS rapid triggers

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanLocked, setIsScanLocked] = useState(false);
  const lastProcessTimeRef = useRef(0); // Ref for debounce timestamp

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const handleBarcodeScanned = async ({ data }) => {
    const now = Date.now();
    if (isScanLocked || isSaving || (now - lastProcessTimeRef.current < DEBOUNCE_DELAY)) {
      return; // Exit if locked, saving, or too soon after last process
    }

    console.log("Raw QR data:", data);
    lastProcessTimeRef.current = now; // Update timestamp
    setIsScanLocked(true);
    setIsSaving(true);

    try {
      const parsed = JSON.parse(data);
      setScannedData(parsed);

      const checkRecord = {
        studentId: parsed.studentId || `NO-ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        studentName: parsed.studentName || "N/A",
        dutyType: parsed.dutyType || "N/A", // Consistent key
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
      // Unlock after 10 seconds
      setTimeout(() => {
        setIsScanLocked(false);
        setScannedData(null);
      }, SCAN_COOLDOWN);
    }
  };

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

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={isScanLocked || isSaving ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"], // QR only
        }}
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
            onPress={() => {
              if (!isScanLocked) {
                setScannedData(null);
                lastProcessTimeRef.current = 0; // Reset debounce on manual clear
              }
            }}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
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
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#333",
    padding: 10,
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
