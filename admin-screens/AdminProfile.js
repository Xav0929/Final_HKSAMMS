import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, CommonActions } from "@react-navigation/native";

const PRIMARY_COLOR = "#00A4DF";

export default function AdminProfile() {
  const [adminData, setAdminData] = useState({
    name: "Loading...",
    id: "N/A",
    status: "N/A",
    password: "********",
    email: "N/A",
    role: "Loading...",
  });
  const navigation = useNavigation();

  useEffect(() => {
  const fetchProfile = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(allKeys);
    console.log("AsyncStorage contents:", items);

    const token = await AsyncStorage.getItem("token");
    const role = await AsyncStorage.getItem("role");
    console.log("Retrieved token (full):", token);
    console.log("Retrieved role:", role);

    if (!token || !role) {
      Alert.alert("Error", "No authentication token or role found. Please log in again.");
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
      return;
    }

    if (role.toLowerCase() !== "admin") {
      Alert.alert("Access Denied", "This page is for admins only.");
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
      return;
    }

    const response = await axios.get(" https://final-hksamms.onrender.com/api/users/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Profile response:", response.data);
    const user = response.data;
    setAdminData({
      name: user.username || "N/A",
      id: user.employeeId || "N/A",
      status: user.status || "N/A",
      password: "********",
      email: user.email || "N/A",
      role: user.role || "N/A",
    });
  } catch (error) {
    console.error("Error fetching profile:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers,
    });
    let errorMessage = "Failed to fetch profile. Please try again.";
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (error.response.status === 403) {
        errorMessage = "Access denied. Admins only.";
      } else if (error.response.status === 404) {
        errorMessage = "User not found. Please check your account.";
      }
    } else if (!error.response) {
      errorMessage = "Network error. Please check your connection.";
    }

    Alert.alert("Error", errorMessage);
    if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 403) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("role");
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    }
  }
};

    fetchProfile();
  }, [navigation]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("role");
      console.log("Logged out successfully");
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Profile</Text>
      <View style={styles.profileCard}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{adminData.name}</Text>
        <Text style={styles.label}>Employee ID:</Text>
        <Text style={styles.value}>{adminData.id}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{adminData.email}</Text>
        <Text style={styles.label}>Role:</Text>
        <Text style={styles.value}>{adminData.role}</Text>
        <Text style={styles.label}>Status:</Text>
        <Text
          style={[
            styles.value,
            adminData.status === "Active" ? styles.active : styles.inactive,
          ]}
        >
          {adminData.status}
        </Text>
        <Text style={styles.label}>Password:</Text>
        <Text style={styles.value}>{adminData.password}</Text>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 40,
    textAlign: "center",
  },
  profileCard: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  label: { fontSize: 14, color: "#555", marginTop: 10 },
  value: { fontSize: 16, fontWeight: "600", color: "#333" },
  active: { color: "green" },
  inactive: { color: "red" },
  logoutBtn: {
    backgroundColor: "#ffcccc",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  logoutText: { color: "#a60000", fontWeight: "600" },
});