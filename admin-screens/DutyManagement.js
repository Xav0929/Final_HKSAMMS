import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { FlatList } from "react-native";
import ScholarDutyFormModal from "../components/ScholarDutyFormModal";
import ScholarDutyViewModal from "../components/ScholarDutyViewModal";
import axios from "axios";

const PRIMARY_COLOR = "#00A4DF";
const { width } = Dimensions.get("window");

const TIMES = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"
];

export default function DutyManagement() {
  const [duties, setDuties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [viewDuty, setViewDuty] = useState(null);
  const [formData, setFormData] = useState({
    id: "", name: "", year: "", course: "", dutyType: "",
    schedules: [{ day: "", startTime: "", endTime: "", room: "" }],
  });
  const [isLoading, setIsLoading] = useState(false);

  // ========================= FETCH =========================
  useEffect(() => {
    const fetchDuties = async () => {
      try {
        const response = await axios.get("https://final-hksamms.onrender.com/api/duties");
        setDuties(response.data);
      } catch (error) {
        console.error("Error fetching duties:", error);
        Alert.alert("Error", "Failed to load duties.");
      }
    };
    fetchDuties();
  }, []);

  // ========================= VALIDATION & OVERLAP =========================
  const validateScholarAccount = async (scholarId) => {
    try {
      const res = await axios.get(`https://final-hksamms.onrender.com/api/scholars/${scholarId}`);
      return res.data.exists === true;
    } catch { return false; }
  };

  const doTimeRangesOverlap = (day1, s1, e1, day2, s2, e2) => {
    if (day1 !== day2) return false;
    const i1 = TIMES.indexOf(s1), i2 = TIMES.indexOf(e1);
    const j1 = TIMES.indexOf(s2), j2 = TIMES.indexOf(e2);
    if (i1 === -1 || i2 === -1 || j1 === -1 || j2 === -1) return false;
    return i1 < j2 && j1 < i2;
  };

  const checkScheduleOverlap = (newS, existing, id, editing) => {
    const same = existing.filter(d => d.id === id);
    return newS.some((ns, i) => {
      if (!ns.day || !ns.startTime || !ns.endTime) return false;
      return same.some(d => {
        if (editing && d._id === newS[i]?._id) return false;
        const [s, e] = d.time.split(" - ");
        return doTimeRangesOverlap(ns.day, ns.startTime, ns.endTime, d.day, s, e);
      });
    });
  };

  // ========================= SAVE =========================
  const saveDuty = async (duty, isEditing) => {
    if (!duty.id || !duty.dutyType || !duty.schedules?.length)
      throw new Error("ID, duty type, and schedule required.");

    if (!await validateScholarAccount(duty.id))
      throw new Error("Unknown account.");

    if (checkScheduleOverlap(duty.schedules, duties, duty.id, isEditing))
      throw new Error("Schedule conflict.");

    const toSave = duty.schedules.map(s => ({
      name: duty.name, id: duty.id, year: duty.year, course: duty.course,
      dutyType: duty.dutyType, day: s.day,
      time: `${s.startTime} - ${s.endTime}`,
      room: duty.dutyType === "Attendance Checker" ? "N/A" : s.room || "",
      status: "Active",
    }));

    try {
      if (isEditing) {
        const existing = duties.filter(d => d.id === duty.id);
        await Promise.all(existing.map(d => d._id ? axios.delete(`https://final-hksamms.onrender.com/api/duties/${d._id}`) : null));
      }

      const res = await Promise.all(toSave.map(item => axios.post("https://final-hksamms.onrender.com/api/duties", item)));
      const saved = res.map(r => r.data);

      if (isEditing) {
        setDuties(prev => [...prev.filter(d => d.id !== duty.id), ...saved]);
      } else {
        setDuties(prev => [...prev, ...saved]);
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // ========================= SCHOLAR LOOKUP =========================
  const handleIdChange = (id) => {
    setFormData(prev => ({ ...prev, id }));
    if (id.length === 14 && /^[0-9-]+$/.test(id)) fetchScholarDetails(id);
    else setFormData(prev => ({ ...prev, name: "", year: "", course: "", dutyType: "" }));
  };

  const fetchScholarDetails = async (id) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`https://final-hksamms.onrender.com/api/scholars/${id}`);
      if (!res.data.exists) throw new Error("Scholar not found");
      const s = res.data.scholar;
      const duty = ["Student Facilitator", "Attendance Checker"].includes(s.duty) ? s.duty : "Student Facilitator";
      setFormData(prev => ({
        ...prev, id, name: s.name || "", year: s.year || "", course: s.course || "", dutyType: duty
      }));
    } catch (e) {
      Alert.alert("Error", e.message === "Scholar not found" ? "Not found." : "Failed to load.");
      setFormData(prev => ({ ...prev, name: "", year: "", course: "", dutyType: "" }));
    } finally {
      setIsLoading(false);
    }
  };

  // ========================= FILTER =========================
  const filtered = duties.filter(duty => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const inc = v => v?.toString().toLowerCase().includes(q);

    const all = inc(duty.name) || inc(duty.id) || inc(duty.dutyType) ||
                inc(duty.day) || inc(duty.time) || inc(duty.room) ||
                inc(duty.year) || inc(duty.course) || inc(duty.status);

    if (!q.includes(":")) return all;

    return q.split(/\s+/).every(part => {
      if (!part.includes(":")) return all;
      const [k, v] = part.split(":").map(s => s.trim().toLowerCase());
      if (!v) return true;
      switch (k) {
        case "dutytype": case "type":   return duty.dutyType?.toLowerCase().includes(v);
        case "day":                     return duty.day?.toLowerCase().includes(v);
        case "time":                    return duty.time?.toLowerCase().includes(v);
        case "room":                    return duty.room?.toLowerCase().includes(v);
        case "year":                    return duty.year?.toLowerCase().includes(v);
        case "course":                  return duty.course?.toLowerCase().includes(v);
        case "id": case "scholar":      return duty.id?.toLowerCase().includes(v);
        case "name":                    return duty.name?.toLowerCase().includes(v);
        case "status":                  return duty.status?.toLowerCase().includes(v);
        default:                        return all;
      }
    });
  });

  // ========================= PAGINATION =========================
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const paginatedDuties = filtered.slice(startIdx, startIdx + rowsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ========================= RENDER =========================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Duty Management</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => {
            setModalVisible(true);
            setEditIndex(null);
            setFormData({
              id: "", name: "", year: "", course: "", dutyType: "",
              schedules: [{ day: "", startTime: "", endTime: "", room: "" }],
            });
          }}
        >
          <Text style={styles.btnText}>+ Assign Duty</Text>
        </TouchableOpacity>
      </View>

      {/* Search + Clear */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <TextInput
          placeholder="Search Duty..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.search, { flex: 1, marginRight: 8 }]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
            <Text style={{ fontSize: 18, color: "#999" }}>X</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Count */}
      <Text style={styles.sectionTitle}>
        Assigned Duties ({filtered.length}) – Page {currentPage} of {totalPages || 1}
      </Text>

      {/* ======== TABLE WITH STICKY HEADER ======== */}
      <FlatList
        data={paginatedDuties}
        keyExtractor={(item, idx) => item._id || `${item.id}-${idx}`}
        ListHeaderComponent={() => (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Name</Text>
            <Text style={[styles.th, { flex: 2 }]}>ID</Text>
            <Text style={[styles.th, { flex: 2 }]}>Duty Type</Text>
            <Text style={[styles.th, { flex: 1 }]}>Day</Text>
            <Text style={[styles.th, { flex: 2 }]}>Time</Text>
            <Text style={[styles.th, { flex: 1 }]}>Room</Text>
            <Text style={[styles.th, { flex: 1 }]}>Status</Text>
            <Text style={[styles.th, { flex: 2 }]}>Actions</Text>
          </View>
        )}
        stickyHeaderIndices={[0]}
        renderItem={({ item, index }) => (
          <DutyTableRow
            duty={item}
            index={startIdx + index}
            onEdit={() => {
              setEditIndex(startIdx + index);
              setModalVisible(true);
              const allForScholar = duties.filter(d => d.id === item.id);
              const schedules = allForScholar.map(d => ({
                day: d.day,
                startTime: d.time.split(" - ")[0],
                endTime: d.time.split(" - ")[1],
                room: d.room,
              }));
              setFormData({
                ...item,
                schedules: schedules.length ? schedules : [{ day: "", startTime: "", endTime: "", room: "" }],
              });
            }}
            onView={() => setViewDuty(item)}
            onToggleStatus={async () => {
              const i = duties.findIndex(d => d._id === item._id);
              if (i === -1) return;
              const newStatus = duties[i].status === "Active" ? "Deactivated" : "Active";
              try {
                await axios.patch(`https://final-hksamms.onrender.com/api/duties/${item._id}/status`, { status: newStatus });
                setDuties(prev => {
                  const upd = [...prev];
                  upd[i].status = newStatus;
                  return upd;
                });
              } catch (e) {
                Alert.alert("Error", "Failed to update status");
              }
            }}
          />
        )}
        style={{ flex: 1 }}
      />

      {/* ======== PAGINATION BAR ======== */}
      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={[styles.pageBtn, currentPage === 1 && styles.disabledBtn]}
        >
          <Text style={styles.pageBtnText}>Prev</Text>
        </TouchableOpacity>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <TouchableOpacity
            key={page}
            onPress={() => goToPage(page)}
            style={[
              styles.pageNum,
              currentPage === page && styles.activePage
            ]}
          >
            <Text style={[
              styles.pageNumText,
              currentPage === page && styles.activePageText
            ]}>{page}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={[styles.pageBtn, currentPage === totalPages && styles.disabledBtn]}
        >
          <Text style={styles.pageBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* ======== MODALS ======== */}
      <ScholarDutyFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditIndex(null);
          setFormData({
            id: "", name: "", year: "", course: "", dutyType: "",
            schedules: [{ day: "", startTime: "", endTime: "", room: "" }],
          });
        }}
        onSave={saveDuty}
        initialData={formData}
        onIdChange={handleIdChange}
        YEARS={["1st Year", "2nd Year", "3rd Year", "4th Year"]}
        COURSES={[
          "BS ACCOUNTANCY", "BS HOSPITALITY MANAGEMENT", "BS TOURISM MANAGEMENT",
          "BSBA- MARKETING MANAGEMENT", "BSBA- BANKING & MICROFINANCE",
          "BACHELOR OF ELEMENTARY EDUCATION", "BSED- ENGLISH", "BSED- FILIPINO",
          "BS CRIMINOLOGY", "BS CIVIL ENGINEERING", "BS INFORMATION TECHNOLOGY", "BS NURSING",
        ]}
        DUTY_TYPES={["Student Facilitator", "Attendance Checker"]}
        DAYS={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}
        TIMES={TIMES}
        ROOMS={[
          "201", "202", "CL1", "CL2", "208", "209",
          "301", "302", "304", "305", "307", "308", "309",
          "401", "402", "403", "404", "405", "CL3", "CL4",
          "408", "409",
        ]}
      />

      <ScholarDutyViewModal
        duty={viewDuty}
        onClose={() => setViewDuty(null)}
        onDeactivate={(idx) => {
          const upd = duties.filter((_, i) => i !== idx);
          setDuties(upd);
          setViewDuty(null);
        }}
      />
    </View>
  );
}

// ====================== ROW COMPONENT (FIXED BUTTONS) ======================
const DutyTableRow = ({ duty, onEdit, onView, onToggleStatus }) => (
  <View style={styles.tableRow}>
    <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{duty.name}</Text>
    <Text style={[styles.td, { flex: 2 }]}>{duty.id}</Text>
    <Text style={[styles.td, { flex: 2 }]}>{duty.dutyType}</Text>
    <Text style={[styles.td, { flex: 1 }]}>{duty.day}</Text>
    <Text style={[styles.td, { flex: 2 }]}>{duty.time}</Text>
    <Text style={[styles.td, { flex: 1 }]}>{duty.room}</Text>
    <Text style={[styles.td, { flex: 1, color: duty.status === "Active" ? "#28a745" : "#dc3545" }]}>
      {duty.status}
    </Text>

    {/* ========== ACTION BUTTONS (Colored & Visible) ========== */}
    <View style={[styles.td, { flex: 2, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }]}>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={onView}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>View</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={onEdit}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.statusBtn,
          {
            backgroundColor: duty.status === "Active" ? "#dc3545" : "#28a745",
          },
        ]}
        onPress={onToggleStatus}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>
          {duty.status === "Active" ? "Deactivate" : "Activate"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ====================== STYLES ======================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginTop: 30 },
  createBtn: { backgroundColor: PRIMARY_COLOR, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, marginTop: 30 },
  btnText: { color: "white", fontWeight: "600" },
  search: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginVertical: 8 },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  th: { fontWeight: "bold", textAlign: "center" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  td: { fontSize: 14, textAlign: "center" },

  // ========== ACTION BUTTONS (Colored) ==========
  viewBtn: {
    backgroundColor: "#007bff", // Blue
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 60,
    opacity: 1,
  },
  editBtn: {
    backgroundColor: "#fd7e14", // Orange
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 60,
    opacity: 1,
  },
  statusBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 80,
    opacity: 1,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    flexWrap: "wrap",
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  disabledBtn: { backgroundColor: "#ccc" },
  pageBtnText: { color: "#fff", fontWeight: "600" },
  pageNum: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
    borderRadius: 18,
    backgroundColor: "#eee",
  },
  activePage: { backgroundColor: PRIMARY_COLOR },
  pageNumText: { fontWeight: "600" },
  activePageText: { color: "#fff" },
});