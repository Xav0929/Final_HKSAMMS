


import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FACI_ATTENDANCE_URL = "http://192.168.1.9:8000/api/faci-attendance";

const QRCheckIn = ({ scannedData }) => {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedUsername = await AsyncStorage.getItem("username");
        if (isMounted && storedUsername) {
          setCurrentUserId(storedUsername.trim());
        }
      } catch (error) {
        console.warn("QRCheckIn (student) failed to load user id:", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadRecords = useCallback(async () => {
    if (!currentUserId) {
      setRecords([]);
      return;
    }

    try {
      const response = await fetch(
        `${FACI_ATTENDANCE_URL}?studentId=${encodeURIComponent(currentUserId)}`
      );
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const ownRecords = Array.isArray(data)
        ? data.filter((item) =>
            typeof item.studentId === 'string' &&
            item.studentId.trim().toLowerCase() === currentUserId.trim().toLowerCase()
          )
        : [];
      setRecords(ownRecords);
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Update records when new scannedData is received
  useEffect(() => {
    if (!scannedData || !currentUserId) return;

    const scannedId = typeof scannedData.studentId === 'string' ? scannedData.studentId.trim() : '';
    if (scannedId && scannedId.toLowerCase() !== currentUserId.trim().toLowerCase()) {
      console.warn('QRCheckIn (student) ignoring scanned data for different user:', scannedId);
      return;
    }

    const checkInTime = new Date().toISOString();
    const newRecord = {
      studentId: currentUserId,
      studentName: scannedData.studentName || "N/A",
      checkerId: "FAC001",
      checkerName: "John Facilitator",
      checkInTime,
      location: scannedData.location || "Room 101",
      status: "Present",
      dutyType: scannedData.dutyType || "N/A",
    };

    setRecords((prev) => {
      const exists = prev.some(
        (r) =>
          r.studentId === newRecord.studentId &&
          r.checkInTime === newRecord.checkInTime
      );
      if (exists) return prev;
      return [newRecord, ...prev];
    });

    loadRecords();
  }, [currentUserId, loadRecords, scannedData]);

  // Filter records by search input with defensive checks
  const filteredRecords = records.filter((r) => {
    const studentName = r.studentName || "";
    const studentId = r.studentId || "";
    return (
      (typeof studentName === "string" &&
        studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof studentId === "string" &&
        studentId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📋 QR Check-In Records</Text>

      {/* Search Bar */}
      <TextInput
        placeholder="Search by name or ID..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchBar}
      />

      {/* Table Header */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerText]}>ID</Text>
        <Text style={[styles.cell, styles.headerText]}>Name</Text>
        <Text style={[styles.cell, styles.headerText]}>Duty</Text>
        <Text style={[styles.cell, styles.headerText]}>Status</Text>
        <Text style={[styles.cell, styles.headerText]}>Time</Text>
      </View>

      {/* Table Body */}
      <ScrollView>
        {filteredRecords.length > 0 ? (
          filteredRecords.map((r, i) => (
            <View
              key={`${r.studentId}-${r.checkInTime}-${i}`} // Unique key with index fallback
              style={[
                styles.row,
                { backgroundColor: i % 2 === 0 ? "#f9f9f9" : "#fff" },
              ]}
            >
              <Text style={styles.cell}>{r.studentId}</Text>
              <Text style={styles.cell}>{r.studentName}</Text>
              <Text style={styles.cell}>{r.dutyType || "N/A"}</Text>
              <Text style={styles.cell}>{r.status}</Text>
              <Text style={styles.cell}>{new Date(r.checkInTime).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No check-in records yet.</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 15,
    marginTop: 15,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#00A4DF",
  },
  searchBar: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  cell: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
  },
  headerRow: {
    backgroundColor: "#00A4DF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerText: {
    color: "#fff",
    fontWeight: "bold",
  },
  noData: {
    textAlign: "center",
    color: "#777",
    marginTop: 20,
  },
});

export default QRCheckIn;

