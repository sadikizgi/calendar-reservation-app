import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import CalendarScreen from '../screens/CalendarScreen';
import PropertyCalendarScreen from '../screens/PropertyCalendarScreen';
import SimplePropertyCalendarScreen from '../screens/SimplePropertyCalendarScreen';
import AddReservationScreen from '../screens/AddReservationScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import PropertyManagementScreen from '../screens/PropertyManagementScreen';
import DebugScreen from '../screens/DebugScreen';
import MasterDashboardScreen from '../screens/MasterDashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TabIcon = ({ title, focused }: { title: string; focused: boolean }) => (
  <Text style={{ color: focused ? '#007AFF' : '#999', fontSize: 12 }}>
    {title}
  </Text>
);

const MainTabs = () => {
  const { logout, state } = useAuth();

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
        options={({ navigation }) => ({
          title: 'Evlerim',
          tabBarIcon: ({ focused }) => <TabIcon title="🏠" focused={focused} />,
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
              <Text style={{ color: '#FFF', fontSize: 14 }}>
                {state.user?.username}
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Text 
                style={{ color: '#FFF', fontSize: 16 }}
                onPress={() => logout()}
              >
Çıkış
              </Text>
            </View>
          ),
        })}
      />
      <Tab.Screen 
        name="UserManagement" 
        component={UserManagementScreen}
        options={{
          title: 'Kullanıcılar',
          tabBarIcon: ({ focused }) => <TabIcon title="👥" focused={focused} />,
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
              <Text style={{ color: '#FFF', fontSize: 14 }}>
                {state.user?.username}
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Text 
                style={{ color: '#FFF', fontSize: 16 }}
                onPress={logout}
              >
Çıkış
              </Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Debug" 
        component={DebugScreen}
        options={{
          title: 'Veriler',
          tabBarIcon: ({ focused }) => <TabIcon title="📊" focused={focused} />,
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
              <Text style={{ color: '#FFF', fontSize: 14 }}>
                {state.user?.username}
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Text 
                style={{ color: '#FFF', fontSize: 16 }}
                onPress={logout}
              >
Çıkış
              </Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="PropertyManagement" 
        component={PropertyManagementScreen}
        options={{
          title: 'Ev Yönetimi',
          tabBarIcon: ({ focused }) => <TabIcon title="🏘️" focused={focused} />,
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
              <Text style={{ color: '#FFF', fontSize: 14 }}>
                {state.user?.username}
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <Text 
                style={{ color: '#FFF', fontSize: 16 }}
                onPress={() => logout()}
              >
Çıkış
              </Text>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ focused }) => <TabIcon title="⚙️" focused={focused} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { state, logout } = useAuth();

  if (state.isLoading) {
    return null; // Show splash screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.isAuthenticated ? (
          <>
            {/* Master user gets special dashboard */}
            {state.user?.role === 'master' ? (
              <Stack.Screen name="MasterDashboard" component={MasterDashboardScreen} />
            ) : (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen 
                  name="PropertyCalendar" 
                  component={SimplePropertyCalendarScreen}
                  options={({ navigation }) => ({
                    headerShown: true,
                    headerStyle: { backgroundColor: '#007AFF' },
                    headerTintColor: '#FFF',
                    headerLeft: () => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                        <TouchableOpacity 
                          style={{ 
                            paddingHorizontal: 12, 
                            paddingVertical: 8, 
                            marginRight: 15,
                            minWidth: 44,
                            minHeight: 44,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          onPress={() => navigation.goBack()}
                        >
                          <Text style={{ color: '#FFF', fontSize: 20 }}>
                            ←
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#FFF', fontSize: 14 }}>
                          {state.user?.username}
                        </Text>
                      </View>
                    ),
                    headerRight: () => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                        <Text 
                          style={{ color: '#FFF', fontSize: 16 }}
                          onPress={() => logout()}
                        >
          Çıkış
                        </Text>
                      </View>
                    ),
                  })}
                />
                <Stack.Screen 
                  name="AddReservation" 
                  component={AddReservationScreen}
                  options={({ navigation }) => ({
                    headerShown: true,
                    title: 'Rezervasyon Ekle',
                    headerStyle: { backgroundColor: '#007AFF' },
                    headerTintColor: '#FFF',
                    headerLeft: () => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
                        <TouchableOpacity 
                          style={{ 
                            paddingHorizontal: 12, 
                            paddingVertical: 8, 
                            marginRight: 15,
                            minWidth: 44,
                            minHeight: 44,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          onPress={() => navigation.goBack()}
                        >
                          <Text style={{ color: '#FFF', fontSize: 20 }}>
                            ←
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#FFF', fontSize: 14 }}>
                          {state.user?.username}
                        </Text>
                      </View>
                    ),
                    headerRight: () => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                        <Text 
                          style={{ color: '#FFF', fontSize: 16 }}
                          onPress={() => logout()}
                        >
          Çıkış
                        </Text>
                      </View>
                    ),
                  })}
                />
              </>
            )}
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;