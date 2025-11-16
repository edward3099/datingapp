# EAS Build Setup Guide

This guide will help you set up EAS Build to build and submit your iOS app to App Store Connect.

## Why EAS Build?

✅ **No local Xcode needed** - Uses correct Xcode version in cloud  
✅ **Automatic dSYM generation** - Handles all build settings  
✅ **No configuration headaches** - Works out of the box  
✅ **Most reliable** - Optimized for App Store submission  
✅ **Handles code signing** - Automatic provisioning profiles  

## Setup Steps

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

You'll be prompted to:
- Enter your Expo account email and password
- Or create a new Expo account (free)
- Or login with Google/GitHub

### Step 3: Configure EAS Build

```bash
eas build:configure
```

This will:
- Create `eas.json` configuration file
- Set up build profiles (development, preview, production)
- Configure iOS and Android build settings

### Step 4: Configure iOS Build Settings (if needed)

Edit `eas.json` to customize build settings:

```json
{
  "build": {
    "production": {
      "ios": {
        "image": "latest",
        "distribution": "store",
        "bundleIdentifier": "com.expo.goapp"
      }
    },
    "preview": {
      "ios": {
        "simulator": true
      }
    }
  }
}
```

### Step 5: Build for Production

```bash
# Build for iOS (production)
eas build --platform ios --profile production
```

This will:
- Upload your project to Expo servers
- Build with correct Xcode version automatically
- Generate dSYM files correctly
- Create an `.ipa` file ready for App Store submission

### Step 6: Submit to App Store

After the build completes:

```bash
# Submit to App Store Connect
eas submit --platform ios
```

Or submit from App Store Connect:
- Download the `.ipa` from the EAS Build dashboard
- Upload to App Store Connect manually
- Use Xcode Organizer to submit

## Build Profiles

### Production Profile
- **Purpose**: App Store submission
- **Distribution**: App Store
- **Signed**: Yes (with your distribution certificate)
- **dSYMs**: Automatically generated
- **Xcode**: Latest release version

### Preview Profile
- **Purpose**: Internal testing (TestFlight)
- **Distribution**: Internal/TestFlight
- **Signed**: Yes
- **dSYMs**: Automatically generated

### Development Profile
- **Purpose**: Development builds
- **Distribution**: Ad-hoc or development
- **Signed**: Yes (with development certificate)

## What EAS Build Handles Automatically

✅ **Xcode Version**: Uses latest release version (not beta)  
✅ **dSYM Generation**: Configures DEBUG_INFORMATION_FORMAT correctly  
✅ **Code Signing**: Generates provisioning profiles automatically  
✅ **Framework dSYMs**: Handles React Native framework symbols  
✅ **Build Settings**: Optimizes all build configurations  
✅ **Dependencies**: Installs and configures CocoaPods correctly  

## Monitoring Builds

### Check Build Status

```bash
# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

### Build Dashboard

Visit: https://expo.dev/accounts/[your-account]/projects/[your-project]/builds

You can:
- View build logs in real-time
- Download `.ipa` files
- Check build status
- See build artifacts

## Troubleshooting

### Build Fails

1. **Check build logs:**
   ```bash
   eas build:view [BUILD_ID]
   ```

2. **Common issues:**
   - Missing credentials → Run `eas build:configure` again
   - Code signing issues → Run `eas credentials`
   - Dependency errors → Check `package.json` and `app.json`

### Need to Update Credentials

```bash
# Configure credentials
eas credentials

# iOS specific
eas credentials:configure -p ios
```

### Need to Clear Cache

```bash
# Build with cleared cache
eas build --platform ios --profile production --clear-cache
```

## Cost

- **EAS Build**: Free tier available (limited builds per month)
- **Expo Account**: Free (with paid plans for more builds)
- **Apple Developer**: $99/year (required for App Store submission)

## Next Steps After Build

1. **Wait for build to complete** (usually 10-20 minutes)
2. **Download `.ipa` file** from EAS dashboard
3. **Submit to App Store:**
   - Use `eas submit --platform ios`
   - Or upload via App Store Connect
   - Or use Xcode Organizer

## Benefits Over Local Builds

✅ **No Xcode version issues** - Always uses correct version  
✅ **No dSYM configuration** - Handled automatically  
✅ **No local setup** - Works from any machine  
✅ **Consistent builds** - Same environment every time  
✅ **Faster builds** - Optimized cloud infrastructure  
✅ **Better logs** - Comprehensive build logs in dashboard  

## Quick Reference Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios

# View builds
eas build:list

# Configure credentials
eas credentials
```

## Need Help?

- EAS Build Documentation: https://docs.expo.dev/build/introduction/
- EAS CLI Documentation: https://docs.expo.dev/eas/
- Expo Discord: https://chat.expo.dev/
- Stack Overflow: Tag questions with `expo` and `eas-build`


