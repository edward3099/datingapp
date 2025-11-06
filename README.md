# Expo Go Dating App

A modern dating app built with React Native and Expo, featuring swipe-based matching, chat functionality, and profile management.

## Features

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

1. Onboarding → SwipeScreen (after completion)
2. SwipeScreen → ViewProfile (tap on card)
3. SwipeScreen → UserProfile (profile button)
4. SwipeScreen → Chats (messages button)
5. Chats → Messages (tap on conversation)
