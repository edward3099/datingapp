import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import SplashScreen from '../screens-components/splashscreen';
import LoginSignUp from '../screens-components/loginsignup';
import LoginFlow from '../screens-components/loginflow';
import Onboarding from '../screens-components/onboarding';
import SwipeScreen from '../screens-components/swipescreen';
import UserProfileScreen from '../screens-components/userprofilescreenwithedits';
import ProfileOfOtherPeopleScreen from '../screens-components/profileofotherpeople';
import ChatsScreen from '../screens-components/chatscreen-updated';
import MessagesScreen from '../screens-components/messagesscreen';
import DebugScreen from '../components/DebugScreen';
import DevMenu from '../components/DevMenu';
import ErrorBoundary from '../components/ErrorBoundary';

const Stack = createNativeStackNavigator();

function AppNavigatorContent() {
  const { isAuthenticated, loading, onboardingComplete } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F6FF' }}>
        <ActivityIndicator size="large" color="#5BC0F8" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? (onboardingComplete ? 'SwipeScreen' : 'Onboarding') : 'Splash'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="LoginSignUp" component={LoginSignUp} />
      <Stack.Screen name="LoginFlow" component={LoginFlow} />
      <Stack.Screen name="Onboarding" component={Onboarding} />
      {isAuthenticated && (
        <>
          <Stack.Screen name="SwipeScreen" component={SwipeScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="ProfileOfOtherPeople" component={ProfileOfOtherPeopleScreen} />
          <Stack.Screen name="Chats" component={ChatsScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
        </>
      )}
      {typeof __DEV__ !== 'undefined' && __DEV__ && (
        <Stack.Screen 
          name="Debug" 
          component={DebugScreen}
          options={{ headerShown: true, title: 'Debug Console' }}
        />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigatorContent />
        <ErrorBoundary>
          <DevMenu />
        </ErrorBoundary>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
