# TestFlight Setup Guide

This guide will help you prepare and submit your app to TestFlight for beta testing.

## Prerequisites

1. **Apple Developer Account** (paid membership required - $99/year)
2. **Xcode** installed on your Mac (latest version recommended)
3. **Expo CLI** installed globally: `npm install -g expo-cli`
4. **EAS CLI** installed: `npm install -g eas-cli`
5. **Apple Developer Portal** access

## Step 1: Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

## Step 3: Configure Your App for Production

### Update app.json

Make sure your `app.json` has the correct bundle identifier and version:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1"
    }
  }
}
```

**Important:**
- `bundleIdentifier` must match your Apple Developer account
- `version` is the user-facing version (e.g., "1.0.0")
- `buildNumber` must increment with each build (e.g., "1", "2", "3")

### Update package.json version

Make sure your `package.json` version matches:

```json
{
  "version": "1.0.0"
}
```

## Step 4: Initialize EAS Build (First Time Only)

If you haven't set up EAS Build yet:

```bash
eas build:configure
```

This will create an `eas.json` file. You can customize it, but the defaults are usually fine for TestFlight.

## Step 5: Build for iOS Production

### Option A: Build Locally (Faster, but requires Xcode)

```bash
eas build --platform ios --local
```

### Option B: Build on EAS Servers (Recommended for first time)

```bash
eas build --platform ios --profile production
```

**Note:** The first build may take 15-30 minutes. Subsequent builds are usually faster.

## Step 6: Submit to TestFlight

Once the build completes, submit it to TestFlight:

```bash
eas submit --platform ios
```

This will:
1. Upload your build to App Store Connect
2. Process it (usually takes 10-30 minutes)
3. Make it available in TestFlight

## Step 7: Configure TestFlight in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → Select your app
3. Go to **TestFlight** tab
4. Wait for processing to complete (you'll see a yellow "Processing" status)
5. Once processed, add internal/external testers

### Adding Testers

**Internal Testers:**
- Go to **TestFlight** → **Internal Testing**
- Add users from your App Store Connect team
- They can test immediately after you add them

**External Testers:**
- Go to **TestFlight** → **External Testing**
- Create a new group
- Add testers (up to 10,000)
- Requires App Review (usually 24-48 hours)

## Step 8: Test Your Build

1. Testers will receive an email invitation
2. They need to install the **TestFlight app** from the App Store
3. They can then install your beta app from TestFlight

## Production Build Checklist

Before submitting, verify:

- [ ] All debug logging is disabled (✅ Already done - see `utils/logger.js`)
- [ ] Debug screen is not accessible (✅ Already done)
- [ ] Dev menu is hidden (✅ Already done)
- [ ] Version number is correct in `app.json` and `package.json`
- [ ] Bundle identifier matches your Apple Developer account
- [ ] App icon and splash screen are set
- [ ] All required app store screenshots are prepared (if submitting to App Store later)
- [ ] Privacy policy URL is set (if required)
- [ ] App Store description is ready

## Common Issues and Solutions

### Issue: "Bundle identifier already exists"
**Solution:** Make sure the bundle identifier in `app.json` matches your App Store Connect app, or create a new app in App Store Connect with that identifier.

### Issue: "Invalid provisioning profile"
**Solution:** Run `eas build:configure` again and ensure your Apple Developer account is properly linked.

### Issue: Build fails with code signing error
**Solution:** 
1. Make sure you're logged into the correct Apple Developer account
2. Check that your bundle identifier is unique
3. Try: `eas build --platform ios --clear-cache`

### Issue: "App Store Connect API Key not found"
**Solution:** 
1. Create an App Store Connect API key in App Store Connect
2. Download the `.p8` file
3. Run `eas submit --platform ios` and follow prompts to add the key

### Issue: Build takes too long
**Solution:** 
- Use `--local` flag to build on your machine (requires Xcode)
- Or wait - first builds always take longer

## Updating Your App

For subsequent updates:

1. **Increment build number** in `app.json`:
   ```json
   "ios": {
     "buildNumber": "2"  // Increment this
   }
   ```

2. **Optionally update version**:
   ```json
   "version": "1.0.1"  // If you want to show a new version
   ```

3. **Build again**:
   ```bash
   eas build --platform ios --profile production
   ```

4. **Submit**:
   ```bash
   eas submit --platform ios
   ```

## Environment-Specific Configuration

If you need different configurations for development vs production:

1. Create `eas.json`:
   ```json
   {
     "build": {
       "development": {
         "ios": {
           "buildConfiguration": "Debug"
         }
       },
       "production": {
         "ios": {
           "buildConfiguration": "Release"
         }
       }
     }
   }
   ```

2. Build with specific profile:
   ```bash
   eas build --platform ios --profile production
   ```

## Quick Reference Commands

```bash
# Login to Expo
eas login

# Configure EAS (first time)
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build locally (faster)
eas build --platform ios --local

# Submit to TestFlight
eas submit --platform ios

# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

## What's Already Configured for Production

✅ **Debug logging disabled** - All `console.log`, `console.info`, `console.warn` are silenced in production  
✅ **Debug screen hidden** - Only accessible in development mode  
✅ **Dev menu hidden** - Triple-tap dev menu only works in development  
✅ **Error logging optimized** - Only critical errors are logged in production  
✅ **Stack traces hidden** - Users won't see technical error details  

## Next Steps After TestFlight

Once your app is tested and ready:

1. **Prepare App Store listing:**
   - App description
   - Screenshots (required for all device sizes)
   - App icon
   - Privacy policy URL
   - Keywords
   - Support URL

2. **Submit for App Review:**
   ```bash
   eas submit --platform ios --latest
   ```

3. **Monitor in App Store Connect:**
   - Check review status
   - Respond to any review feedback
   - Release when approved

## Support

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **TestFlight Guide:** https://developer.apple.com/testflight/
- **Expo Discord:** https://chat.expo.dev/

---

**Last Updated:** Based on current app configuration  
**App Version:** Check `app.json` for current version  
**Bundle ID:** Check `app.json` → `expo.ios.bundleIdentifier`


