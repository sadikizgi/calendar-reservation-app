import React from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';

import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#007AFF" />
        <AppNavigator />
      </AuthProvider>
    </LanguageProvider>
  );
}
