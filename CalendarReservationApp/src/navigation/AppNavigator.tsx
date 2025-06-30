import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AddReservationScreen from '../screens/AddReservationScreen';
import UserManagementScreen from '../screens/UserManagementScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TabIcon = ({ title, focused }: { title: string; focused: boolean }) => (
  <Text style={{ color: focused ? '#007AFF' : '#999', fontSize: 12 }}>
    {title}
  </Text>
);

const MainTabs = () => {
  const { logout } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#007AFF' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{
          title: 'Takvim',
          tabBarIcon: ({ focused }) => <TabIcon title="📅" focused={focused} />,
          headerRight: () => (
            <Text 
              style={{ color: '#FFF', marginRight: 15, fontSize: 16 }}
              onPress={logout}
            >
              Çıkış
            </Text>
          ),
        }}
      />
      <Tab.Screen 
        name="UserManagement" 
        component={UserManagementScreen}
        options={{
          title: 'Kullanıcılar',
          tabBarIcon: ({ focused }) => <TabIcon title="👥" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { state } = useAuth();

  if (state.isLoading) {
    return null; // Show splash screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="AddReservation" 
              component={AddReservationScreen}
              options={{
                headerShown: true,
                title: 'Rezervasyon Ekle',
                headerStyle: { backgroundColor: '#007AFF' },
                headerTintColor: '#FFF',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;