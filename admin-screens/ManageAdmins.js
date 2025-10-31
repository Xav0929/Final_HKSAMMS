import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import AdminModalForm from "../components/AdminModalForm";
import AdminTable from "../components/AdminTable";

const PRIMARY_COLOR = "#00A4DF";
const API_URL = " https://final-hksamms.onrender.com/api/users";

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_URL);
        console.log("Fetched admins:", response.data); // Debug log
        setAdmins(response.data);
      } catch (error) {
        console.error("Error fetching admins:", error);
        Alert.alert("Error", "Failed to fetch admins from the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const saveAdmin = async (adminData, isEditing) => {
    try {
      if (!adminData.name || !adminData.email || !adminData.password || !adminData.employeeId) {
        Alert.alert("Error", "Name, Email, Password, and Employee ID are required.");
        return;
      }

      const payload = {
        username: adminData.name,
        email: adminData.email,
        employeeId: adminData.employeeId,
        password: adminData.password,
        role: "admin",
        status: "Active",
      };
      console.log("Sending payload:", payload); // Debug log

      let response;
      if (isEditing && editIndex !== null) {
        const existing = admins[editIndex];
        response = await axios.put(`${API_URL}/${existing._id}`, payload);
        const updated = [...admins];
        updated[editIndex] = { ...existing, ...payload, _id: existing._id }; // Ensure _id is preserved
        setAdmins(updated);
      } else {
        response = await axios.post(API_URL, payload);
        setAdmins([...admins, response.data]);
      }

      setModalVisible(false);
      setEditIndex(null);
    } catch (error) {
      console.error("Error saving admin:", error.response?.data || error);
      Alert.alert("Error", error.response?.data?.message || "Failed to save admin.");
    }
  };

  const disableAdmin = async (index) => {
    try {
      const admin = admins[index];
      if (!admin || !admin._id) {
        console.error("Invalid admin or missing _id:", admin);
        Alert.alert("Error", "Invalid admin data. Please refresh and try again.");
        return;
      }
      console.log("Disabling admin with _id:", admin._id); // Debug log
      const updatedUser = await axios.put(`${API_URL}/${admin._id}`, { ...admin, status: "Inactive" });

      const updated = [...admins];
      updated[index] = updatedUser.data;
      setAdmins(updated);
    } catch (error) {
      console.error("Error disabling admin:", error.response?.data || error);
      Alert.alert("Error", error.response?.data?.message || "Failed to disable admin.");
    }
  };

  const reactivateAdmin = async (index) => {
    try {
      const admin = admins[index];
      if (!admin || !admin._id) {
        console.error("Invalid admin or missing _id:", admin);
        Alert.alert("Error", "Invalid admin data. Please refresh and try again.");
        return;
      }
      console.log("Reactivating admin with _id:", admin._id); // Debug log
      const updatedUser = await axios.put(`${API_URL}/${admin._id}`, { ...admin, status: "Active" });

      const updated = [...admins];
      updated[index] = updatedUser.data;
      setAdmins(updated);
    } catch (error) {
      console.error("Error reactivating admin:", error);
      Alert.alert("Error", "Failed to reactivate admin.");
    }
  };

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.status === "Active").length;
  const inactiveAdmins = admins.filter((a) => a.status === "Inactive").length;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{ textAlign: "center", marginTop: 10 }}>Loading admins...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Admins</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.btnText}>+ Create Admin</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: "#E0F7FA" }]}>
          <Text style={styles.statNumber}>{totalAdmins}</Text>
          <Text style={styles.statLabel}>Total Admins</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
          <Text style={styles.statNumber}>{activeAdmins}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#FFEBEE" }]}>
          <Text style={styles.statNumber}>{inactiveAdmins}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      <ScrollView>
        <AdminTable
          admins={admins}
          onDisable={disableAdmin}
          onReactivate={reactivateAdmin}
        />
      </ScrollView>

      <AdminModalForm
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditIndex(null);
        }}
        onSave={saveAdmin}
        initialData={editIndex !== null ? admins[editIndex] : null}
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
    marginTop: 20,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  createBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  btnText: { color: "#fff", fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statNumber: { fontSize: 20, fontWeight: "bold", color: "#333" },
  statLabel: { fontSize: 12, color: "#555", marginTop: 4 },
});