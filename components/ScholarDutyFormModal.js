import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import AntDesign from "@expo/vector-icons/AntDesign";
import ConfettiCannon from "react-native-confetti-cannon";

const ScholarDutyFormModal = ({
  visible,
  onClose,
  onSave,
  initialData = null,
  onIdChange,
  YEARS,
  COURSES,
  DUTY_TYPES,
  DAYS,
  TIMES,
  ROOMS,
}) => {
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState(null);
  const [course, setCourse] = useState(null);
  const [dutyType, setDutyType] = useState(null);
  const [schedules, setSchedules] = useState([{ day: "", startTime: "", endTime: "", room: "" }]);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    console.log("useEffect triggered with initialData:", initialData);
    setStudentName(initialData?.name || "");
    setStudentId(initialData?.id || "");
    setYear(initialData?.year || null);
    setCourse(initialData?.course || null);
    setDutyType(initialData?.dutyType || null);
    // Limit to 2 schedules for initial data
    const initialSchedules = initialData?.schedules?.length > 0 
      ? initialData.schedules.slice(0, 2) 
      : [{ day: "", startTime: "", endTime: "", room: "" }];
    setSchedules(initialSchedules);
    console.log("Initialized schedules:", initialSchedules);
  }, [initialData]);

  const handleIdChange = (text) => {
    console.log("ID input changed:", text);
    let formatted = text.replace(/[^0-9-]/g, "");
    if (formatted.length === 2 && studentId.length < 2) formatted += "-";
    if (formatted.length === 7 && studentId.length < 7) formatted += "-";
    setStudentId(formatted);
    if (onIdChange && formatted.length === 14) {
      console.log("Triggering onIdChange with:", formatted);
      onIdChange(formatted);
    }
  };

  const handleDutyTypeChange = (item) => {
    console.log("Duty type changed to:", item.value);
    setDutyType(item.value);
  };

  const isEditing = !!initialData?.id;

  const isFormComplete =
    studentName &&
    studentId &&
    year &&
    course &&
    dutyType &&
    schedules.every((s) =>
      dutyType === "Attendance Checker"
        ? s.day && s.startTime && s.endTime
        : s.day && s.startTime && s.endTime && s.room
    );

  const doTimeRangesOverlap = (day1, start1, end1, day2, start2, end2) => {
    console.log(`In-modal overlap check: ${day1} ${start1}-${end1} vs ${day2} ${start2}-${end2}`);
    if (day1 !== day2) {
      console.log("No overlap: different days");
      return false;
    }
    const startIndex1 = TIMES.indexOf(start1);
    const endIndex1 = TIMES.indexOf(end1);
    const startIndex2 = TIMES.indexOf(start2);
    const endIndex2 = TIMES.indexOf(end2);
    if (startIndex1 === -1 || endIndex1 === -1 || startIndex2 === -1 || endIndex2 === -1) {
      console.log("No overlap: invalid time indices", { startIndex1, endIndex1, startIndex2, endIndex2 });
      return false;
    }
    const hasOverlap = startIndex1 < endIndex2 && startIndex2 < endIndex1;
    console.log(`In-modal overlap result: ${hasOverlap}`);
    return hasOverlap;
  };

  const addSchedule = () => {
    if (schedules.length >= 2) {
      console.log("Cannot add schedule: maximum of 2 schedules reached");
      Alert.alert("Schedule Limit", "A maximum of 2 schedules is allowed.");
      return;
    }
    const newSchedule = { day: "", startTime: "", endTime: "", room: "" };
    console.log("Adding new schedule:", newSchedule);
    setSchedules([...schedules, newSchedule]);
  };
  const removeSchedule = (index) => {
  const updated = schedules.filter((_, i) => i !== index);
  setSchedules(updated);
};


  const updateSchedule = (index, field, value) => {
    console.log(`Updating schedule ${index + 1}, field: ${field}, value: ${value}`);
    const updated = [...schedules];
    updated[index][field] = value;
    // Check for overlaps when updating day, startTime, or endTime
    if (field === "day" || field === "startTime" || field === "endTime") {
      const currentSchedule = updated[index];
      if (currentSchedule.day && currentSchedule.startTime && currentSchedule.endTime) {
        console.log("Checking for in-modal overlaps with:", currentSchedule);
        const hasOverlap = updated.some((sched, i) => {
          if (i === index) {
            console.log("Skipping same schedule index:", i);
            return false;
          }
          if (!sched.day || !sched.startTime || !sched.endTime) {
            console.log("Skipping incomplete schedule:", sched);
            return false;
          }
          const overlap = doTimeRangesOverlap(
            currentSchedule.day,
            currentSchedule.startTime,
            currentSchedule.endTime,
            sched.day,
            sched.startTime,
            sched.endTime
          );
          if (overlap) {
            console.log(`Overlap detected with schedule ${i + 1}:`, sched);
          }
          return overlap;
        });
        if (hasOverlap) {
          console.log("Showing overlap alert and resetting field");
          Alert.alert("Schedule Conflict", "The selected schedule overlaps with another. Please choose a different time slot.");
          updated[index][field] = ""; // Reset the field to prevent overlap
        }
      } else {
        console.log("Schedule incomplete, skipping overlap check:", currentSchedule);
      }
    }
    setSchedules(updated);
  };

  const handleSave = async () => {
    console.log("handleSave called with schedules:", schedules);
    if (!isFormComplete) {
      console.log("Form incomplete, showing alert");
      return Alert.alert("Missing Info", "Please fill in all fields.");
    }

    for (let s of schedules) {
      const startIndex = TIMES.indexOf(s.startTime);
      const endIndex = TIMES.indexOf(s.endTime);

      if (startIndex === -1 || endIndex === -1) {
        console.log("Invalid time selection:", s);
        return Alert.alert("Invalid Selection", "Please select valid start and end times.");
      }

      if (startIndex >= endIndex) {
        console.log("Invalid time range:", s);
        return Alert.alert("Invalid Time", "End time must be later than Start time.");
      }

      if (endIndex - startIndex < 2) {
        console.log("Duty duration too short:", s);
        return Alert.alert("Invalid Duty Duration", "1hr or above allowed duty hours.");
      }
    }

    try {
      console.log("Calling onSave with duty data");
      await onSave({
        name: studentName,
        id: studentId,
        year,
        course,
        dutyType,
        schedules,
        status: "Active",
      }, isEditing);
      console.log("onSave completed successfully");
      onClose();
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Save error caught in handleSave:", error.message);
      if (error.message === "Unknown account. Please register first.") {
        console.log("Showing account error alert");
        Alert.alert("Account Error", "Unknown account. Please register first.");
      } else if (error.message === "The selected schedule overlaps with another. Please choose a different time slot.") {
        console.log("Showing database overlap alert");
        Alert.alert("Schedule Conflict", error.message);
      } else {
        console.log("Showing generic save error alert");
        Alert.alert("Save Error", `Failed to save duty: ${error.message || "Please check the data."}`);
      }
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
  };

  const toDropdownData = (arr) => arr.map((v) => ({ label: v, value: v }));

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.title}>Assign Scholar Duty</Text>

              <Text style={styles.label}>
                Student Name {isEditing && <Text style={styles.disabledLabelText}>(Cannot be changed)</Text>}
              </Text>
              <TextInput
                placeholder="Enter Student Name"
                placeholderTextColor="#888"
                value={studentName}
                onChangeText={setStudentName}
                editable={!isEditing}
                style={[styles.input, isEditing && styles.inputDisabled]}
              />

              <Text style={styles.label}>
                Student ID {isEditing && <Text style={styles.disabledLabelText}>(Cannot be changed)</Text>}
              </Text>
              <TextInput
                placeholder="00-0000-000000"
                placeholderTextColor="#888"
                value={studentId}
                keyboardType="numeric"
                onChangeText={handleIdChange}
                maxLength={14}
                editable={!isEditing}
                style={[styles.input, isEditing && styles.inputDisabled]}
              />

              <Text style={styles.label}>
                Year {isEditing && <Text style={styles.disabledLabelText}>(Cannot be changed)</Text>}
              </Text>
              <Dropdown
                style={[styles.dropdown, isEditing && styles.dropdownDisabled]}
                placeholderStyle={[styles.placeholderStyle, isEditing && styles.placeholderDisabled]}
                selectedTextStyle={[styles.selectedTextStyle, isEditing && styles.selectedTextDisabled]}
                data={toDropdownData(YEARS)}
                labelField="label"
                valueField="value"
                placeholder="Select Year"
                value={year}
                disable={isEditing}
                onChange={(item) => !isEditing && setYear(item.value)}
                renderLeftIcon={() => (
                  <AntDesign name="calendar" size={16} color={isEditing ? "#999" : "#555"} style={styles.icon} />
                )}
              />

              <Text style={styles.label}>
                Course {isEditing && <Text style={styles.disabledLabelText}>(Cannot be changed)</Text>}
              </Text>
              <Dropdown
                style={[styles.dropdown, isEditing && styles.dropdownDisabled]}
                placeholderStyle={[styles.placeholderStyle, isEditing && styles.placeholderDisabled]}
                selectedTextStyle={[styles.selectedTextStyle, isEditing && styles.selectedTextDisabled]}
                data={toDropdownData(COURSES)}
                labelField="label"
                valueField="value"
                placeholder="Select Course"
                value={course}
                disable={isEditing}
                onChange={(item) => !isEditing && setCourse(item.value)}
                renderLeftIcon={() => (
                  <AntDesign name="book" size={16} color={isEditing ? "#999" : "#555"} style={styles.icon} />
                )}
              />

              <Text style={styles.label}>
                Duty Type {isEditing && <Text style={styles.disabledLabelText}>(Cannot be changed)</Text>}
              </Text>
              <Dropdown
                style={[styles.dropdown, isEditing && styles.dropdownDisabled]}
                placeholderStyle={[styles.placeholderStyle, isEditing && styles.placeholderDisabled]}
                selectedTextStyle={[styles.selectedTextStyle, isEditing && styles.selectedTextDisabled]}
                data={toDropdownData(DUTY_TYPES)}
                labelField="label"
                valueField="value"
                placeholder="Select Duty Type"
                value={dutyType}
                disable={isEditing}
                onChange={(item) => !isEditing && handleDutyTypeChange(item)}
                renderLeftIcon={() => (
                  <AntDesign name="idcard" size={16} color={isEditing ? "#999" : "#555"} style={styles.icon} />
                )}
              />

              <Text style={styles.sectionTitle}>Schedules</Text>
              {schedules.map((sched, index) => (
               <View key={index} style={styles.scheduleCard}>
  <View style={styles.scheduleHeader}>
    <Text style={styles.scheduleTitle}>Schedule {index + 1}</Text>

    {schedules.length > 1 && (
      <TouchableOpacity onPress={() => removeSchedule(index)}>
        <AntDesign name="close" size={15} color="red" />

      </TouchableOpacity>
    )}
  </View>

                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    data={toDropdownData(DAYS)}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Day"
                    value={sched.day}
                    onChange={(item) => updateSchedule(index, "day", item.value)}
                    renderLeftIcon={() => (
                      <AntDesign name="calendar" size={16} color="#555" style={styles.icon} />
                    )}
                  />

                  <View style={styles.row}>
                    <Dropdown
                      style={[styles.dropdown, { flex: 1, marginRight: 5 }]}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={toDropdownData(TIMES)}
                      labelField="label"
                      valueField="value"
                      placeholder="Start Time"
                      value={sched.startTime}
                      onChange={(item) => updateSchedule(index, "startTime", item.value)}
                    />
                    <Dropdown
                      style={[styles.dropdown, { flex: 1, marginLeft: 5 }]}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={toDropdownData(TIMES)}
                      labelField="label"
                      valueField="value"
                      placeholder="End Time"
                      value={sched.endTime}
                      onChange={(item) => updateSchedule(index, "endTime", item.value)}
                    />
                  </View>

                  {dutyType !== "Attendance Checker" && (
                    <Dropdown
                      style={styles.dropdown}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={toDropdownData(ROOMS)}
                      labelField="label"
                      valueField="value"
                      placeholder="Select Room"
                      value={sched.room}
                      onChange={(item) => updateSchedule(index, "room", item.value)}
                      renderLeftIcon={() => (
                        <AntDesign name="home" size={16} color="#555" style={styles.icon} />
                      )}
                    />
                  )}
                </View>
              ))}

              <TouchableOpacity 
                onPress={addSchedule} 
                style={[styles.addScheduleBtn, schedules.length >= 2 && styles.disabledBtn]}
                disabled={schedules.length >= 2}
              >
                <Text style={styles.addScheduleText}>+ Add Another Schedule</Text>
              </TouchableOpacity>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.saveBtn, !isFormComplete && { backgroundColor: "gray" }]}
                  onPress={handleSave}
                  disabled={!isFormComplete}
                >
                  <Text style={styles.btnText}>Assigning Duty</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <ConfettiCannon
            count={150}
            origin={{ x: -10, y: 0 }}
            fadeOut={true}
          />
          <View style={styles.successBox}>
            <TouchableOpacity style={styles.closeIcon} onPress={closeSuccessModal}>
              <AntDesign name="close" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.successText}>
              ✅ Successfully {isEditing ? "Updated" : "Added New"} Scholar Duty
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: Platform.OS === "web" ? "50%" : "90%",
    maxWidth: 600,
    maxHeight: "90%",
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  label: { fontWeight: "600", marginBottom: 5, fontSize: 13 },
  disabledLabelText: { fontSize: 11, fontWeight: "400", color: "#999", fontStyle: "italic" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    fontSize: 13,
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#d3d3d3",
    opacity: 0.6,
    color: "#666",
  },
  dropdown: {
    height: 38,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  dropdownDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#d3d3d3",
    opacity: 0.6,
  },
  placeholderStyle: { fontSize: 13, color: "#999" },
  placeholderDisabled: { color: "#999" },
  selectedTextStyle: { fontSize: 13, color: "#000" },
  selectedTextDisabled: { color: "#666" },
  icon: { marginRight: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginVertical: 10 },
  scheduleCard: {
    backgroundColor: "#f9fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  scheduleTitle: { fontWeight: "600", marginBottom: 8, fontSize: 13 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  addScheduleBtn: { 
    backgroundColor: "#0078d7", 
    padding: 10, 
    borderRadius: 8, 
    marginVertical: 10 
  },
  disabledBtn: {
    backgroundColor: "gray",
    opacity: 0.5,
  },
  addScheduleText: { color: "white", fontWeight: "600", textAlign: "center" },
  btnRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "space-between",
    gap: 10,
  },
  saveBtn: { backgroundColor: "green", padding: 10, borderRadius: 8, flex: 1 },
  cancelBtn: { backgroundColor: "red", padding: 10, borderRadius: 8, flex: 1 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  successBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: 300,
    alignItems: "center",
    position: "relative",
  },
  successText: {
    fontSize: 16,
    fontWeight: "700",
    color: "green",
    textAlign: "center",
    marginVertical: 20,
  },
  closeIcon: { position: "absolute", top: 10, right: 10 },
  scheduleHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
},
scheduleHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
},

});

export default ScholarDutyFormModal;