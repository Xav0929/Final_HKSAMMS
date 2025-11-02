import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import ScholarFormModal from "../components/ScholarFormModal";
import ScholarViewModal from "../components/ScholarViewModal";
import ScholarTable from "../components/ScholarTable";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { YEARS, COURSES } from "../constants/scholarMeta";

const PRIMARY_COLOR = "#00A4DF";
const DUTY_TYPES = ["Student Facilitator", "Attendance Checker"];

const PAGE_SIZE = 10; // rows per page

export default function ManageAccounts() {
  const [scholars, setScholars] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState({
    name: "",
    id: "",
    year: YEARS[0],
    course: COURSES[0],
    duty: DUTY_TYPES[0],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [viewScholar, setViewScholar] = useState(null);

  useEffect(() => {
    fetchScholars();
  }, []);

  const fetchScholars = async () => {
    try {
      const response = await fetch("http://192.168.86.39:8000/api/scholars");
      const data = await response.json();
      setScholars(data);
    } catch (err) {
      Alert.alert("Error", "Unable to fetch scholars");
    }
  };

  const updateForm = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const saveScholar = async (data, isEditing) => {
    try {
      if (isEditing && editIndex !== null) {
        await fetch(
          `http://192.168.86.39:8000/api/scholars/${scholars[editIndex]._id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
      } else {
        await fetch("http://192.168.86.39:8000/api/scholars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      resetForm();
      fetchScholars();
    } catch (err) {
      Alert.alert("Error", "Failed to save scholar");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      id: "",
      year: YEARS[0],
      course: COURSES[0],
      duty: DUTY_TYPES[0],
    });
    setEditIndex(null);
    setModalVisible(false);
  };

  const toggleScholarStatus = async (scholar) => {
    const scholarId = scholar._id;
    if (!scholarId) {
      return Alert.alert("Error", "Invalid scholar ID");
    }

    const newStatus =
      scholar.status.toLowerCase() === "active" ? "Inactive" : "Active";

    try {
      const response = await fetch(
        `http://192.168.86.39:8000/api/scholars/${scholarId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }

      Alert.alert("Success", `Scholar status changed to ${newStatus}`);
      await fetchScholars();
    } catch (error) {
      Alert.alert("Error", "Failed to update scholar status");
    }
  };

  /* ---------- SEARCH (ALL COLUMNS) ---------- */
  const filteredScholars = useMemo(() => {
    if (!searchQuery.trim()) return scholars;

    const q = searchQuery.toLowerCase();
    return scholars.filter((s) => {
      return (
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.id ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.year ?? "").toLowerCase().includes(q) ||
        (s.course ?? "").toLowerCase().includes(q) ||
        (s.duty ?? "").toLowerCase().includes(q) ||
        String(s.remainingHours ?? "").includes(q) ||
        (s.status ?? "").toLowerCase().includes(q) ||
        (s.createdAt
          ? new Date(s.createdAt).toLocaleDateString().toLowerCase().includes(q)
          : false) ||
        (s.updatedAt
          ? new Date(s.updatedAt).toLocaleDateString().toLowerCase().includes(q)
          : false)
      );
    });
  }, [scholars, searchQuery]);

  /* ---------- PAGINATION ---------- */
  const totalPages = Math.max(1, Math.ceil(filteredScholars.length / PAGE_SIZE));
  const pageScholars = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredScholars.slice(start, start + PAGE_SIZE);
  }, [filteredScholars, currentPage]);

  // keep page valid when filtering
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  /* ---------- PDF EXPORT (filtered list) ---------- */
  const exportToPDF = async (list) => {
    const escapeHtml = (text) =>
      String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Scholar Accounts Report</title>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; margin: 20px; font-size: 12px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #f0f0f0; }
            tbody tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Scholar Accounts Report</h1>
          <p style="text-align:center;">Generated: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>ID</th><th>Email</th><th>Year</th><th>Course</th>
                <th>Duty</th><th>Hours Left</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${list.length
                ? list
                    .map(
                      (s) => `<tr>
                        <td>${escapeHtml(s.name)}</td>
                        <td>${escapeHtml(s.id)}</td>
                        <td>${escapeHtml(s.email)}</td>
                        <td>${escapeHtml(s.year)}</td>
                        <td>${escapeHtml(s.course)}</td>
                        <td>${escapeHtml(s.duty)}</td>
                        <td>${s.remainingHours ?? 0}</td>
                        <td>${s.status}</td>
                      </tr>`
                    )
                    .join("")
                : `<tr><td colspan="8" style="text-align:center;">No scholars found</td></tr>`
              }
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
      } else {
        Alert.alert("PDF Generated", `Saved at: ${uri}`);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Accounts</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.btnText}>+ Create Scholar Account</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Search any column..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.search}
      />

      <ScrollView>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Scholar Accounts ({filteredScholars.length})
          </Text>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => exportToPDF(filteredScholars)}
          >
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Table + Pagination */}
        <ScholarTable
          scholars={pageScholars}
          onView={(scholar) => setViewScholar(scholar)}
          onEdit={(index) => {
            const realIndex = (currentPage - 1) * PAGE_SIZE + index;
            setEditIndex(realIndex);
            setForm(filteredScholars[realIndex]);
            setModalVisible(true);
          }}
          onToggleStatus={toggleScholarStatus}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            {/* Previous */}
            <TouchableOpacity
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(p => p - 1)}
              style={[styles.pageBtn, currentPage === 1 && styles.disabledBtn]}
            >
              <Text style={styles.pageBtnText}>Previous</Text>
            </TouchableOpacity>

            {/* Clickable Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <TouchableOpacity
                key={page}
                onPress={() => setCurrentPage(page)}
                style={[
                  styles.pageNumBtn,
                  currentPage === page && styles.activePageBtn
                ]}
                disabled={currentPage === page}
              >
                <Text style={[
                  styles.pageNumText,
                  currentPage === page && styles.activePageText
                ]}>
                  {page}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Next */}
            <TouchableOpacity
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage(p => p + 1)}
              style={[
                styles.pageBtn,
                currentPage === totalPages && styles.disabledBtn
              ]}
            >
              <Text style={styles.pageBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ScholarFormModal
        visible={modalVisible}
        onClose={resetForm}
        onSave={saveScholar}
        initialData={editIndex !== null ? form : null}
        YEARS={YEARS}
        COURSES={COURSES}
        DUTY_TYPES={DUTY_TYPES}
      />

      <ScholarViewModal
        scholar={viewScholar}
        onClose={() => setViewScholar(null)}
        onDeactivate={toggleScholarStatus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "bold", marginTop: 30 },
  createBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginTop: 30,
  },
  btnText: { color: "white", fontWeight: "600" },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginVertical: 8 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  exportBtn: {
    backgroundColor: "#28a745",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  exportBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  /* Pagination */
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  pageBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  disabledBtn: {
    backgroundColor: "#aaa",
  },
  pageBtnText: { color: "#fff", fontWeight: "600" },

  // Clickable Page Numbers
  pageNumBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#eee",
    marginHorizontal: 4,
  },
  activePageBtn: {
    backgroundColor: PRIMARY_COLOR,
  },
  pageNumText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  activePageText: {
    color: "#fff",
  },
});