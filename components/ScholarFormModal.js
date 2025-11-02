import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import ConfettiCannon from "react-native-confetti-cannon";

const ScholarFormModal = ({
  visible,
  onClose,
  onSave,
  initialData = null,
  YEARS,
  COURSES,
  DUTY_TYPES,
}) => {
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState(null);
  const [course, setCourse] = useState(null);
  const [dutyType, setDutyType] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocus, setIsFocus] = useState({
    year: false,
    course: false,
    duty: false,
  });

  const [errors, setErrors] = useState({});
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const isEditing = !!initialData;

  useEffect(() => {
    if (visible) {
      setStudentName(initialData?.name || "");
      setStudentId(initialData?.id || "");
      setEmail(initialData?.email || "");
      setPassword(initialData?.password || "");
      setYear(initialData?.year || null);
      setCourse(initialData?.course || null);
      setDutyType(initialData?.duty || null);
      setErrors({});
    }
  }, [visible, initialData]);

  const validate = () => {
    const newErrors = {};

    if (!studentName || !studentId || !email || !password || !year || !course || !dutyType) {
      newErrors.general = "Please fill in all fields.";
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+\.au@phinmaed\.com$/;
    if (!emailRegex.test(email)) {
      newErrors.email = "Only emails ending with 'au@phinmaed.com' are allowed.";
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      newErrors.password =
        "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const scholarData = {
      name: studentName,
      id: studentId,
      email,
      password,
      year,
      course,
      duty: dutyType,
    };

    onSave(scholarData, isEditing);
    onClose();
    setSuccessModalVisible(true);
  };

  const closeSuccessModal = () => setSuccessModalVisible(false);

  return (
    <>
      {/* Main Form Modal */}
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.title}>
                {isEditing ? "Edit Scholar Account" : "Create Scholar Account"}
              </Text>

              {/* Student Name */}
              <Text style={styles.label}>Student Name</Text>
              <TextInput
                placeholder="Student Name"
                placeholderTextColor="#888"
                value={studentName}
                onChangeText={setStudentName}
                style={styles.input}
              />

              {/* Student ID */}
              <Text style={styles.label}>Student ID</Text>
              <TextInput
                placeholder="00-0000-000000"
                placeholderTextColor="#888"
                value={studentId}
                keyboardType="numeric"
                onChangeText={(text) => {
                  let formatted = text.replace(/[^0-9-]/g, "");
                  if (formatted.length === 2 && studentId.length < 2) formatted += "-";
                  if (formatted.length === 7 && studentId.length < 7) formatted += "-";
                  setStudentId(formatted);
                }}
                maxLength={14}
                style={styles.input}
              />

              {/* Email */}
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="juan.delacruz.au@phinmaed.com"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter Password..."
                  placeholderTextColor="#888"
                  secureTextEntry={!showPassword}
                />
                
                 
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              {/* Year Dropdown */}
              <Text style={styles.label}>Year</Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocus.year && { borderColor: "#0078d7" },
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={YEARS.map((y) => ({ label: y, value: y }))}
                labelField="label"
                valueField="value"
                placeholder="Select Year"
                value={year}
                onFocus={() => setIsFocus({ ...isFocus, year: true })}
                onBlur={() => setIsFocus({ ...isFocus, year: false })}
                onChange={(item) => {
                  setYear(item.value);
                  setIsFocus({ ...isFocus, year: false });
                }}
                renderLeftIcon={() => (
                  <AntDesign
                    style={styles.icon}
                    color={isFocus.year ? "#0078d7" : "black"}
                    name="calendar"
                    size={18}
                  />
                )}
              />

              {/* Course Dropdown */}
              <Text style={styles.label}>Course</Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocus.course && { borderColor: "#0078d7" },
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                data={COURSES.map((c) => ({ label: c, value: c }))}
                labelField="label"
                valueField="value"
                placeholder="Select Course"
                value={course}
                onFocus={() => setIsFocus({ ...isFocus, course: true })}
                onBlur={() => setIsFocus({ ...isFocus, course: false })}
                onChange={(item) => {
                  setCourse(item.value);
                  setIsFocus({ ...isFocus, course: false });
                }}
              />

              {/* Duty Type Dropdown */}
              <Text style={styles.label}>
                Duty Type {isEditing && <Text style={styles.disabledLabelText}>(Cannot be changed)</Text>}
              </Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocus.duty && { borderColor: "#0078d7" },
                  isEditing && styles.dropdownDisabled,
                ]}
                placeholderStyle={[
                  styles.placeholderStyle,
                  isEditing && styles.placeholderDisabled,
                ]}
                selectedTextStyle={[
                  styles.selectedTextStyle,
                  isEditing && styles.selectedTextDisabled,
                ]}
                data={DUTY_TYPES.map((d) => ({ label: d, value: d }))}
                labelField="label"
                valueField="value"
                placeholder="Select Duty Type"
                value={dutyType}
                disable={isEditing}
                onFocus={() => !isEditing && setIsFocus({ ...isFocus, duty: true })}
                onBlur={() => setIsFocus({ ...isFocus, duty: false })}
                onChange={(item) => {
                  if (!isEditing) {
                    setDutyType(item.value);
                    setIsFocus({ ...isFocus, duty: false });
                  }
                }}
              />

              {/* General Error */}
              {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

              {/* Buttons */}
              <View style={styles.row}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.btnText}>
                    {isEditing ? "Update" : "Save"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <ConfettiCannon count={120} origin={{ x: -10, y: 0 }} fadeOut={true} />
          <View style={styles.successBox}>
            <TouchableOpacity style={styles.closeIcon} onPress={closeSuccessModal}>
              <AntDesign name="close" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.confettiIcon}>🎉</Text>
            <Text style={styles.successText}>✅ Scholar Account Successfully Saved</Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", borderRadius: 10, padding: 20, width: Platform.OS === "web" ? 450 : "90%", maxHeight: "90%" },
  scrollContent: { flexGrow: 1 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 15 },
  label: { fontWeight: "600", marginBottom: 5, fontSize: 14 },
  disabledLabelText: { fontSize: 12, fontWeight: "400", color: "#999", fontStyle: "italic" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 8 },
  passwordInputContainer: { flexDirection: "row", alignItems: "center", position: "relative" },
  passwordInput: { flex: 1 },
  errorText: { color: "red", fontSize: 12, marginBottom: 8 },
  dropdown: { height: 40, borderColor: "#ccc", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 12 },
  dropdownDisabled: { backgroundColor: "#f5f5f5", borderColor: "#d3d3d3", opacity: 0.6 },
  placeholderStyle: { fontSize: 14, color: "#888" },
  placeholderDisabled: { color: "#999" },
  selectedTextStyle: { fontSize: 14, color: "#000" },
  selectedTextDisabled: { color: "#666" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  saveBtn: { backgroundColor: "green", padding: 12, borderRadius: 6, flex: 1, marginRight: 5 },
  cancelBtn: { backgroundColor: "red", padding: 12, borderRadius: 6, flex: 1, marginLeft: 5 },
  btnText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  successOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  successBox: { backgroundColor: "#fff", padding: 20, borderRadius: 12, width: 300, alignItems: "center", position: "relative" },
  successText: { fontSize: 16, fontWeight: "700", color: "green", textAlign: "center", marginVertical: 20 },
  confettiIcon: { fontSize: 40, marginBottom: 10 },
  closeIcon: { position: "absolute", top: 10, right: 10 },
});

export default ScholarFormModal;
