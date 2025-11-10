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

- To expose the dev server over a tunnel (useful for physical devices off your network):
  ```bash
  npm run start:tunnel
  ```

- To print the active tunnel URLs (run after the tunnel server is up):
  ```bash
  npm run tunnel:url
  ```

3. Open the app in Expo Go on your mobile device or use an emulator.

## Testing

The project includes three complementary test layers:

- **Unit & integration (`jest-expo`)**: exercises shared logic and components with React Native Testing Library.
  ```bash
  npm test           # run once
  npm run test:watch # watch mode
  npm run test:coverage
  ```

- **Web end-to-end (Playwright)**: drives the Expo web build for universal flows.
  ```bash
  npx playwright install --with-deps  # first run only
  npm run test:playwright             # starts Expo web (port 19006) and executes specs
  ```

- **Native end-to-end (Detox)**: targets iOS simulators and Android emulators.
  1. Install native tooling (see [Detox environment setup](https://wix.github.io/Detox/docs/introduction/environment-setup/)):
     ```bash
     brew tap wix/brew && brew install applesimutils   # macOS / iOS
     npm install --global detox-cli
     ```
     Create or reuse an Android AVD (e.g. `Pixel_7_API_34`) and ensure the iOS simulator you want (default: **iPhone 15**) is available.
  2. Build and test:
     ```bash
     # iOS
     npm run detox:build:ios
     npm run detox:test:ios

     # Android
     npm run detox:build:android
     npm run detox:test:android

     # run both platforms
     npm run test:detox
     ```

Detox build steps run `expo prebuild` under the hood to materialise native projects. Re-run the corresponding build command whenever native changes are made (for example, after modifying app.json plugins or native modules).

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
