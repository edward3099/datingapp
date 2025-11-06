import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens-components/splashscreen';
import LoginSignUp from '../screens-components/loginsignup';
import LoginFlow from '../screens-components/loginflow';
import Onboarding from '../screens-components/onboarding';
import SwipeScreen from '../screens-components/swipescreen';
import UserProfileScreen from '../screens-components/userprofilescreenwithedits';
import ViewProfileScreen from '../screens-components/viewingotherusersprofilescreen';
import ChatsScreen from '../screens-components/chatscreen';
import MessagesScreen from '../screens-components/messagesscreen';
import DebugScreen from '../components/DebugScreen';
import DevMenu from '../components/DevMenu';
import ErrorBoundary from '../components/ErrorBoundary';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LoginSignUp" component={LoginSignUp} />
        <Stack.Screen name="LoginFlow" component={LoginFlow} />
        <Stack.Screen name="Onboarding" component={Onboarding} />
        <Stack.Screen name="SwipeScreen" component={SwipeScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
        <Stack.Screen name="Chats" component={ChatsScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen 
          name="Debug" 
          component={DebugScreen}
          options={{ headerShown: true, title: 'Debug Console' }}
        />
      </Stack.Navigator>
      <ErrorBoundary>
        <DevMenu />
      </ErrorBoundary>
    </NavigationContainer>
  );
}
