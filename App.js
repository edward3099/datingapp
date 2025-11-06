import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import DevMenu from './components/DevMenu';
import './utils/logger'; // Initialize logger

export default function App() {
  return (
    <ErrorBoundary>
      <AppNavigator />
      <DevMenu />
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}
