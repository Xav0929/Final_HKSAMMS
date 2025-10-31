import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const CheckerProfile = ({ navigation }) => {
  const [scholar, setScholar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScholarProfile = async () => {
    try {
      console.log('📡 Initiating fetchScholarProfile...');

      // Retrieve token and username from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      const username = await AsyncStorage.getItem('username');
      if (!token) {
        console.error('❌ No token found in AsyncStorage');
        setError('No authentication token found');
        setLoading(false);
        return;
      }
      if (!username) {
        console.error('❌ No username found in AsyncStorage');
        setError('No username found');
        setLoading(false);
        return;
      }
      console.log('🔑 Token retrieved:', token);
      console.log('🆔 Username retrieved:', username);

      // API call to fetch scholar by id (username)
      const apiUrl = ' https://final-hksamms.onrender.com/api/scholars';
      const response = await axios.get(`${apiUrl}/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('📥 API Response:', response.data);

      if (response.data.exists) {
        setScholar(response.data.scholar);
        console.log('✅ Scholar data fetched:', response.data.scholar);
      } else {
        console.error('❌ Scholar not found for username:', username);
        setError('Scholar not found');
      }
    } catch (err) {
      console.error('❌ Error fetching scholar profile:', err.message);
      console.error('❌ Error details:', err.response?.data || err);
      setError('Failed to fetch profile: ' + err.message);
    } finally {
      setLoading(false);
      console.log('🏁 Fetch completed, loading set to false');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      console.log('🔓 Initiating logout...');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('role');
      await AsyncStorage.removeItem('username');
      console.log('✅ AsyncStorage cleared');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      console.log('✅ Navigated to LoginScreen');
    } catch (err) {
      console.error('❌ Logout error:', err.message);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  useEffect(() => {
    console.log('🛠️ useEffect triggered for fetching scholar profile');
    fetchScholarProfile();
  }, []);

  if (loading) {
    console.log('⏳ Rendering loading state');
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    console.log('🚨 Rendering error state:', error);
    return (
      <View style={styles.container}>
        <Text>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchScholarProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('🎨 Rendering profile with scholar data:', scholar);
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Checker Profile</Text>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Student Name:</Text>
        <Text style={styles.value}>{scholar?.name || 'N/A'}</Text>

        <Text style={styles.label}>Student ID:</Text>
        <Text style={styles.value}>{scholar?.id || 'N/A'}</Text>

        <Text style={styles.label}>Year:</Text>
        <Text style={styles.value}>{scholar?.year || 'N/A'}</Text>

        <Text style={styles.label}>Course:</Text>
        <Text style={styles.value}>{scholar?.course || 'N/A'}</Text>

        <Text style={styles.label}>Duty Type:</Text>
        <Text style={styles.value}>{scholar?.duty || 'N/A'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e1e1e',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
  },
  value: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  logoutButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#60a5fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CheckerProfile;