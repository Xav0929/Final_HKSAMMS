
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { API_BASE_URL } from "../config/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isDesktop = screenWidth >= 768;
const isTablet = screenWidth >= 640 && screenWidth < 768;

const southImage = require("../assets/south.jpg");
const logoImage = require("../assets/login.png");

const addShadow = (obj = {}) => ({
  ...obj,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
  ...(Platform.OS === "android" && { elevation: 5 }),
});

// ========================== LOGIN FORM ==========================

const LoginFormContent = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [timer, setTimer] = useState(300);
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Countdown timer for code modal
  useEffect(() => {
    let countdown;
    if (showCodeModal && timer > 0) {
      countdown = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(countdown);
  }, [showCodeModal, timer]);

 const handleLogin = async () => {
  if (!username || !loginPassword) {
    setError("Please enter username and password.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: loginPassword }),
    });

    const data = await response.json();
    console.log("Raw backend response:", data);
    console.log("User role:", data.role);

    if (response.ok && data.role) {
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("role", data.role.toLowerCase());// Ensure lowercase
      await AsyncStorage.setItem("username", data.username); 
      console.log("Stored token:", data.token);
      console.log("Stored role:", data.role.toLowerCase());
      console.log("🆔 Stored username:", data.username);

      if (data.role.toLowerCase() === "admin") {
        navigation.reset({
          index: 0,
          routes: [{ name: "AdminTabs" }],
        });
      } else if (data.role.toLowerCase() === "checker") {
        navigation.reset({
          index: 0,
          routes: [{ name: "AttendanceCheckerTabs" }],
        });
      } else if (data.role.toLowerCase() === "facilitator") {
        navigation.reset({
          index: 0,
          routes: [{ name: "StudentFacilitatorTabs" }],
        });
      } else {
        Alert.alert("Error", "Unknown role");
      }
    } else {
      setError(data.message || "Invalid credentials.");
    }
  } catch (err) {
    console.error("Login fetch error:", err.message);
    Alert.alert("Error", "Unable to connect to server.");
  }
};

  const handleForgotPassword = () => {
    setShowEmailModal(true);
  };

  const handleContinueEmail = async () => {
    if (!email) {
      if (Platform.OS === "web") setEmailError("Please enter your email.");
      else Alert.alert("Error", "Please enter your email.");
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+\.au@phinmaed\.com$/i;
    if (!emailPattern.test(email)) {
      const msg = "Invalid PHINMAED email format.";
      if (Platform.OS === "web") setEmailError(msg);
      else Alert.alert("Error", msg);
      return;
    }

    setEmailError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (response.status === 200) {
        setShowEmailModal(false);
        setShowCodeModal(true);
        setTimer(60);
        Alert.alert("Success", data.message);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 4) {
      Alert.alert("Error", "Please enter a valid 4-digit code.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), code }),
      });

      const data = await response.json();

      if (response.status === 200) {
        setShowCodeModal(false);
        setShowResetModal(true);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  const handleResetPassword = async () => {
    if (!passwordNew || !passwordConfirm) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (passwordNew !== passwordConfirm) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), newPassword: passwordNew }),
      });

      const data = await response.json();

      if (response.status === 200) {
        Alert.alert("Success", "Password successfully reset!");
        setShowResetModal(false);
      } else {
        Alert.alert("Error", data.message || "Reset failed");
      }
    } catch (err) {
      console.error("Reset password fetch error:", err);
      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  return (
    <View style={styles.formContainer}>
      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter Username..."
          autoCapitalize="none"
        />
      </View>
      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password:</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            secureTextEntry={!showLoginPassword}
            style={[styles.input]}
            value={loginPassword}
            onChangeText={setLoginPassword}
            placeholder="Enter Password..."
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowLoginPassword(!showLoginPassword)}
          >
            <Ionicons
              name={showLoginPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Forgot Password */}
      <TouchableOpacity
        style={styles.forgotLinkContainer}
        onPress={handleForgotPassword}
      >
        <Text style={styles.forgotLinkText}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Login Button */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      {/* ===================== Modals ===================== */}
      {/* 1️⃣ Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Ionicons name="mail-outline" size={48} color="#60a5fa" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Step 1: Verify Your Email</Text>
            <Text style={styles.modalDesc}>
              Enter the email address linked to your account. We'll send a 4-digit verification code.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. juan.delacruz.au@phinmaed.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(text) => {
                setEmail(text.toLowerCase());
                if (emailError) setEmailError("");
              }}
              keyboardType="email-address"
            />
            {Platform.OS === "web" && emailError ? (
              <Text style={styles.webErrorText}>{emailError}</Text>
            ) : null}
            <TouchableOpacity style={styles.modalButton} onPress={handleContinueEmail}>
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmailModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2️⃣ Code Modal */}
      <Modal visible={showCodeModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Ionicons name="key-outline" size={48} color="#60a5fa" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Step 2: Enter Verification Code</Text>
            <Text style={styles.modalDesc}>
              We’ve sent a 4-digit code to your email. Enter it below to verify your identity.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter 4-digit code"
              placeholderTextColor="#9ca3af"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.timerText}>
              {timer > 0 ? `Resend available in ${timer}s` : "Didn't receive code?"}
            </Text>
            {timer === 0 && (
              <TouchableOpacity onPress={() => setTimer(60)} style={styles.resendBtn}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalButton} onPress={handleVerifyCode}>
              <Text style={styles.modalButtonText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCodeModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3️⃣ Reset Password Modal */}
      <Modal visible={showResetModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color="#60a5fa"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>Step 3: Reset Your Password</Text>
            <Text style={styles.modalDesc}>
              Create a new password. Make sure it meets all the requirements below:
            </Text>

            {/* Password Requirements */}
            {(() => {
              const passwordChecks = {
                length: passwordNew.length >= 8,
                upper: /[A-Z]/.test(passwordNew),
                lower: /[a-z]/.test(passwordNew),
                number: /\d/.test(passwordNew),
                special: /[@$!%*?&]/.test(passwordNew),
              };

              return (
                <View style={styles.passwordRequirements}>
                  {[
                    { key: "length", text: "Has at least 8 characters" },
                    { key: "upper", text: "Includes at least one uppercase letter" },
                    { key: "lower", text: "Includes at least one lowercase letter" },
                    { key: "number", text: "Includes at least one number" },
                    { key: "special", text: "Includes at least one special character" },
                  ].map((req) => (
                    <View key={req.key} style={styles.requirementRow}>
                      <Ionicons
                        name={
                          passwordChecks[req.key]
                            ? "checkmark-circle"
                            : "checkmark-circle-outline"
                        }
                        size={18}
                        color={passwordChecks[req.key] ? "green" : "#9ca3af"}
                        style={styles.requirementIcon}
                      />
                      <Text
                        style={[
                          styles.requirementText,
                          { color: passwordChecks[req.key] ? "green" : "#374151" },
                        ]}
                      >
                        {req.text}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* New Password Input */}
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.modalInput, { paddingRight: 40 }]}
                placeholder="New Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPasswordNew}
                value={passwordNew}
                onChangeText={setPasswordNew}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPasswordNew(!showPasswordNew)}
              >
                <Ionicons
                  name={showPasswordNew ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.modalInput, { paddingRight: 40 }]}
                placeholder="Confirm New Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPasswordConfirm}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
              >
                <Ionicons
                  name={showPasswordConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {/* Password Match Indicator */}
            {passwordConfirm.length > 0 && (
              <Text
                style={{
                  color: passwordNew === passwordConfirm ? "green" : "red",
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                {passwordNew === passwordConfirm
                  ? "Passwords match ✅"
                  : "Passwords do not match ❌"}
              </Text>
            )}

            {/* Reset Button */}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                const passwordRegex =
                  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

                if (!passwordRegex.test(passwordNew)) {
                  Alert.alert(
                    "Weak Password",
                    "Please meet all password requirements before resetting."
                  );
                  return;
                }
                if (passwordNew !== passwordConfirm) {
                  Alert.alert("Error", "Passwords do not match.");
                  return;
                }

                handleResetPassword();
              }}
            >
              <Text style={styles.modalButtonText}>Reset Password</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowResetModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ========================== LOGO SECTION ==========================

const LogoSection = ({ size = 36 }) => (
  <View style={[styles.logoContainer, { marginBottom: 40 }]}>
    <Image
      source={logoImage}
      style={[
        styles.logoImage,
        { width: size * 5, height: size * 0.8, maxWidth: 420 },
      ]}
      resizeMode="contain"
    />
  </View>
);

const PortalImage = ({ style }) => (
  <Image
    source={southImage}
    style={[styles.portalImageDefault, style]}
    resizeMode="cover"
  />
);

// ========================== MAIN SCREEN ==========================

const LoginScreen = ({ navigation }) => {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.background} />

      {isDesktop ? (
        <View style={styles.desktopWrapper}>
          <View style={styles.desktopImagePanel}>
            <PortalImage />
          </View>
          <View style={styles.desktopFormPanel}>
            <View style={{ width: "100%", maxWidth: 320, alignSelf: "center" }}>
              <LogoSection size={96} />
              <LoginFormContent navigation={navigation} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.mobileWrapper}>
          <View style={styles.mobileImageContainer}>
            <PortalImage />
          </View>
          <View style={styles.mobileFormContainer}>
            <LogoSection size={48} />
            <LoginFormContent navigation={navigation} />
          </View>
        </View>
      )}
    </View>
  );
};

// ========================== STYLES ==========================

const styles = StyleSheet.create({
  background: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#f3f4f6" },
  mainContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, minHeight: screenHeight },
  formContainer: { flexDirection: "column", rowGap: 24 },
  inputGroup: { flexDirection: "column" },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 4 },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "white",
    color: "#1f2937",
    fontSize: 14,
    ...addShadow({ shadowOpacity: 0.05, elevation: 1 }),
  },
  errorText: { color: "red", fontSize: 13, marginTop: 6, textAlign: "center" },
  forgotLinkContainer: { alignSelf: "flex-end", top: -10 },
  forgotLinkText: { fontSize: 12, color: "#60a5fa", fontWeight: "600" },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#60a5fa",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    ...addShadow(),
  },
  buttonText: { color: "white", fontSize: 14, fontWeight: "500", textTransform: "uppercase" },
  logoContainer: { alignItems: "center" },
  logoImage: {},
  desktopWrapper: { width: "100%", maxWidth: 896, height: 650, flexDirection: "row", borderRadius: 16, overflow: "hidden", ...addShadow({ shadowOpacity: 0.25, elevation: 12 }) },
  desktopImagePanel: { width: "50%", justifyContent: "center", alignItems: "center" },
  desktopFormPanel: { width: "50%", justifyContent: "center", alignItems: "center", backgroundColor: "white", padding: isTablet ? 40 : 48 },
  portalImageDefault: { flex: 1, width: "100%", height: "100%" },
  mobileWrapper: { flexDirection: "column", width: "100%", maxWidth: 384, alignSelf: "center" },
  mobileImageContainer: { width: "100%", height: 256, borderRadius: 12, overflow: "hidden", ...addShadow() },
  mobileFormContainer: { width: "88%", backgroundColor: "white", marginTop: -96, zIndex: 10, padding: isTablet ? 32 : 24, borderRadius: 12, alignSelf: "center", ...addShadow({ shadowOpacity: 0.25, elevation: 12 }) },
  passwordInputContainer: { width: "100%", position: "relative", marginBottom: 10 },
  eyeIcon: { position: "absolute", right: 12, top: Platform.OS === "web" ? 14 : 12 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalBox: {
    width: screenWidth * 0.8,
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: { marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 8, textAlign: "center" },
  modalDesc: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 16 },
  modalInput: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#60a5fa",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
    ...addShadow({ shadowOpacity: 0.2, elevation: 3 }),
  },
  modalButtonText: { color: "#fff", fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  modalCancel: { marginTop: 8, fontSize: 14, color: "#ef4444", fontWeight: "500", textAlign: "center" },
  timerText: { fontSize: 13, color: "#6b7280", textAlign: "center", marginVertical: 8 },
  resendBtn: { marginVertical: 4 },
  resendText: { color: "#60a5fa", fontSize: 13, textAlign: "center", textDecorationLine: "underline" },
  passwordRequirements: { width: "100%", marginBottom: 12 },
  requirementRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  requirementIcon: { marginRight: 6 },
  requirementText: { fontSize: 13, color: "#374151" },
  webErrorText: { color: "red", fontSize: 12, textAlign: "center", marginBottom: 6 },
});

export default LoginScreen;