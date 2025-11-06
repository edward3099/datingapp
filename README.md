# Expo Go Dating App

A modern dating app built with React Native and Expo, featuring swipe-based matching, chat functionality, and profile management.

## Features

- **Splash Screen**: Animated app launch screen
- **Login/Sign Up**: Toggle between login and registration
- **Login Flow**: Step-by-step authentication process
- **Onboarding Flow**: Multi-step user onboarding with animated transitions
- **Swipe Screen**: Card-based swiping interface for discovering matches
- **User Profile**: Editable profile with photo gallery and tag management
- **View Profile**: View other users' profiles with metrics and actions
- **Chats List**: Browse all your matches and conversations
- **Messages**: Individual chat conversations with typing indicators

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the Expo development server:
```bash
npm start
```

3. Open the app in Expo Go on your mobile device or use an emulator.

## Required Assets

The following image assets need to be added to `/assets/`:
- `angel.png` (100x100px) - Used in swipe screen for like indicator
- `devil-Photoroom.png` (100x100px) - Used in swipe screen for pass indicator

## Project Structure

```
/
├── screens-components/     # All screen components
│   ├── onboarding.js
│   ├── swipescreen.js
│   ├── userprofilescreenwithedits.js
│   ├── viewingotherusersprofilescreen.js
│   ├── chatscreen.js
│   └── messagesscreen.js
├── navigation/            # Navigation configuration
│   └── AppNavigator.js
├── components/            # Reusable components
├── assets/                # Images and other assets
└── App.js                 # Main app entry point
```

## Dependencies

- expo
- react-native
- @react-navigation/native
- expo-linear-gradient
- expo-blur
- @expo/vector-icons
- react-native-draggable-flatlist
- expo-image-picker

## Navigation Flow

```
🩵  Splash Screen
        │
        ▼
🔐  Login / Sign Up
   ┌───────────────┬────────────────┐
   │                               │
   ▼                               ▼
Login Flow                     Sign Up Flow
   │                               │
   ▼                               ▼
❤️  Swipe Screen          ✨  Onboarding Slides
                              (Welcome → Name → Age/Gender → Bio/Interests → Summary)
                                      │
                                      ▼
                              👤  User Profile Screen
                                      │
                                      ▼
                              ❤️  Swipe Screen
```

### Screen Details

- **Splash Screen** → Shows app logo, navigates to Login/Sign Up after 2 seconds
- **Login/Sign Up** → Toggle between login and sign up modes
- **Login Flow** → Step-by-step login (Email → Password → Swipe Screen)
- **Onboarding** → Multi-step profile setup for new users
- **User Profile** → User's own profile with "Start Swiping" button
- **Swipe Screen** → Main discovery interface
- **View Profile** → View other users' profiles
- **Chats** → List of matches and conversations
- **Messages** → Individual chat conversations
