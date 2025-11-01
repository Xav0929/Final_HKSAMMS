import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CustomHeader() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const navigation = useNavigation();

  const menuItems = [
    { name: 'Dashboard', icon: 'home', screen: 'Dashboard' },
    { name: 'Manage Accounts', icon: 'people', screen: 'Accounts' },
    { name: 'Duty Management', icon: 'clipboard', screen: 'Duty' },
    { name: 'Generate QR', icon: 'qr-code', screen: 'QR' },
    { name: 'Manage Admins', icon: 'shield-checkmark', screen: 'Admin' },
    { name: 'Admin Profile', icon: 'person', screen: 'Profile' },
    { name: 'Logout', icon: 'log-out', screen: 'Logout' },
  ];

  // Show 2-second logging out modal
  const handleLogout = async () => {
    setConfirmLogoutVisible(false);
    setLoggingOut(true);

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await wait(3000);

    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('role');

    setLoggingOut(false);

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleMenuItemPress = (screen) => {
    setMenuVisible(false);

    if (screen === 'Logout') {
      // Show custom confirm modal instead of Alert
      setConfirmLogoutVisible(true);
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginLeft: 15 }}>
        <Ionicons name="menu" size={24} color="white" />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                onPress={() => handleMenuItemPress(item.screen)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: '#e6f0ff' },
                  item.name === 'Logout' && { borderTopWidth: 1, borderTopColor: '#eee' },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.name === 'Logout' ? 'red' : '#60a5fa'}
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    styles.menuText,
                    item.name === 'Logout' && { color: 'red', fontWeight: 'bold' },
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Logout Modal */}
      <Modal visible={confirmLogoutVisible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmText}>Are you sure you want to log out?</Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: '#ccc' }]}
                onPress={() => setConfirmLogoutVisible(false)}
              >
                <Text>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: '#3b82f6' }]}
                onPress={handleLogout}
              >
                <Text style={{ color: 'white' }}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logging Out Modal */}
      <Modal visible={loggingOut} transparent animationType="fade">
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.logoutText}>Logging out...</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingLeft: 20,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 10,
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  menuIcon: { marginRight: 15, width: 24 },
  menuText: { fontSize: 16, color: '#333' },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 10,
    alignItems: 'center',
    width: 200,
  },
  logoutText: { marginTop: 10, fontSize: 16, color: '#333' },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 250,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  confirmButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
});
