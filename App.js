import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './screen/LoginScreen';
import AdminNavigator from './navigations/AdminNavigator';
import CheckerNavigator from './navigations/CheckerNavigator';
import StudentFaciNavigator from './navigations/StudentFaciNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = React.useState(null);

  React.useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const role = await AsyncStorage.getItem('role');

        if (token && role) {
          if (role === 'admin') setInitialRoute('AdminTabs');
          else if (role === 'checker') setInitialRoute('AttendanceCheckerTabs');
          else if (role === 'facilitator') setInitialRoute('StudentFacilitatorTabs');
          else setInitialRoute('Login');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('Error checking login:', error);
        setInitialRoute('Login');
      }
    };

    checkLogin();
  }, []);

  if (!initialRoute) {
    // Small loading spinner while checking
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminTabs" component={AdminNavigator} />
        <Stack.Screen name="AttendanceCheckerTabs" component={CheckerNavigator} />
        <Stack.Screen name="StudentFacilitatorTabs" component={StudentFaciNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
