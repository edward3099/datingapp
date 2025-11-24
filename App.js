import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
// IMPORTANT: Import logger FIRST to catch all early warnings
import './utils/logger'; // Initialize logger - MUST be first
import './utils/testLogger'; // Test logger utility (available in dev)
import './utils/captureReactWarnings'; // Capture React-specific warnings
import './utils/checkLogger'; // Make logger check utilities available
import './utils/exportLogs'; // Make log export utilities available
import './utils/viewCapturedErrors'; // Make error viewing available
import './utils/showErrors'; // Simple error display utility
import './utils/globalErrorHandler'; // Initialize global error handlers

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
