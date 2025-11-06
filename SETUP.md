# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on your device:**
   - Install Expo Go app on your iOS/Android device
   - Scan the QR code from the terminal
   - Or press `i` for iOS simulator, `a` for Android emulator

## Project Structure

```
/
├── App.js                          # Main entry point
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
├── babel.config.js                 # Babel configuration
│
├── navigation/
│   └── AppNavigator.js            # Navigation setup
│
├── screens-components/             # All screen components
│   ├── onboarding.js              # Onboarding flow
│   ├── swipescreen.js             # Swipe cards interface
│   ├── userprofilescreenwithedits.js  # User's own profile
│   ├── viewingotherusersprofilescreen.js  # View other profiles
│   ├── chatscreen.js              # Chats list
│   └── messagesscreen.js          # Individual chat
│
└── assets/                        # Images and assets
    └── (add angel.png and devil-Photoroom.png here)
```

## Navigation Flow

- **Onboarding** → Completes → **SwipeScreen**
- **SwipeScreen** → Can navigate to:
  - **UserProfile** (profile button)
  - **ViewProfile** (tap on card)
  - **Chats** (messages button)
- **Chats** → Tap conversation → **Messages**

## Missing Assets

The app currently uses placeholder icons for the swipe indicators. To use the original images:

1. Add `angel.png` (100x100px) to `/assets/`
2. Add `devil-Photoroom.png` (100x100px) to `/assets/`
3. Uncomment the Image components in `swipescreen.js` (lines 293-304)

## Features Implemented

✅ Onboarding flow with animations
✅ Swipe card interface with gestures
✅ User profile with photo gallery
✅ View other users' profiles
✅ Chats list with matches
✅ Individual message conversations
✅ Navigation between screens
✅ All dependencies configured

## Next Steps

1. Add the missing image assets
2. Connect to a backend API (if needed)
3. Add authentication flow
4. Implement real-time messaging
5. Add push notifications
