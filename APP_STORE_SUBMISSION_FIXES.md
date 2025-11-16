# App Store Submission Fixes

This document addresses the issues encountered when submitting to App Store Connect.

## Issue 1: Unsupported Xcode/SDK Version

**Error:** "Unsupported SDK or Xcode version. Your app was built with an SDK or version of Xcode that isn't supported."

**Current Status:** You're using Xcode 26.1 (Build 17B5045g), which is a **beta version**.

### Solution:

1. **Download the latest Release Candidate (RC) or stable version of Xcode:**
   - Visit: https://developer.apple.com/download/
   - Download the latest **Release Candidate** (RC) version, not beta
   - Check: https://developer.apple.com/news/releases for supported versions

2. **Install the release version:**
   ```bash
   # After downloading, install it
   # You can have multiple Xcode versions installed
   ```

3. **Switch to the release version:**
   ```bash
   # Use xcode-select to switch versions
   sudo xcode-select -s /Applications/Xcode-Release.app/Contents/Developer
   
   # Or use Xcode's built-in version switcher
   # Xcode > Settings > Locations > Command Line Tools
   ```

4. **Verify the version:**
   ```bash
   xcodebuild -version
   # Should show a release version (no "g" suffix in build number)
   ```

5. **Rebuild your archive:**
   - Clean build folder: Product > Clean Build Folder (⇧⌘K)
   - Archive: Product > Archive
   - Submit to App Store Connect

## Issue 2: Missing dSYM Files

**Error:** "The archive did not include a dSYM for React.framework / ReactNativeDependencies.framework / hermes.framework"

### Solutions Applied:

✅ **dSYM generation has been configured** in multiple places:

1. **Expo config plugin**: Sets `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym` for the main app target
2. **Podfile**: Sets `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym` for all CocoaPods targets (including React, ReactNativeDependencies, and hermes)

### Verify dSYM Settings in Xcode:

1. Open your project in Xcode
2. Select the **ExpoGoApp** project in the navigator
3. Select the **ExpoGoApp** target
4. Go to **Build Settings** tab
5. Search for "Debug Information Format"
6. Verify it shows **"DWARF with dSYM File"** for both Debug and Release

### Additional Steps:

1. **When creating an Archive:**
   - Product > Scheme > Edit Scheme
   - Select "Archive" in the left sidebar
   - Ensure "Build Configuration" is set to **Release**
   - Check "Reveal Archive in Organizer" after archiving

2. **Verify dSYM files are generated:**
   After archiving, check:
   ```bash
   # Find your archive (usually in ~/Library/Developer/Xcode/Archives)
   # Navigate to: YourArchive.xcarchive/dSYMs/
   # You should see:
   # - ExpoGoApp.app.dSYM
   # - React.framework.dSYM (if available)
   # - ReactNativeDependencies.framework.dSYM (if available)
   # - hermes.framework.dSYM (if available)
   ```

3. **If dSYM files are still missing:**
   
   **Important Note:** The dSYM warnings for React.framework, ReactNativeDependencies.framework, and hermes.framework might occur even after configuration. This can happen because:
   
   - These frameworks might be prebuilt and distributed without debug symbols
   - Some frameworks are statically linked and don't generate separate dSYM files
   - React Native might bundle frameworks in a way that doesn't preserve dSYMs
   
   **Workaround Options:**
   
   a. **Check if submission is actually blocked:**
      - The warnings might not prevent submission
      - Try submitting anyway - Apple may accept it
      - The Xcode version issue is more critical
   
   b. **Build from source (advanced):**
      - Modify Podfile to build React Native from source
      - This ensures dSYMs are generated, but increases build time
      - Set `podfile_properties['ios.buildReactNativeFromSource'] = 'true'` in app.json
   
   c. **Use EAS Build (recommended):**
      - EAS Build handles dSYM generation automatically
      - It uses the correct Xcode version
      - It properly configures all build settings
   
   d. **Contact Apple Support:**
      - If submission is blocked, contact Apple Developer Support
      - They can provide guidance on framework-specific dSYM requirements

## Issue 3: Code Signing

**Error:** "Signing for 'ExpoGoApp' requires a development team"

### Solution:

1. In Xcode, select the **ExpoGoApp** project
2. Select the **ExpoGoApp** target
3. Go to **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** from the dropdown
6. Xcode will automatically configure provisioning profiles

## Quick Checklist Before Submission:

**Critical (Must Fix):**
- [ ] **Using release version of Xcode (not beta)** ← **MOST IMPORTANT**
- [ ] Code signing configured with valid team
- [ ] Archive created successfully with release Xcode

**Recommended:**
- [ ] DEBUG_INFORMATION_FORMAT set to "dwarf-with-dsym" (already configured)
- [ ] Archive validated (Product > Validate App)
- [ ] All warnings reviewed (dSYM warnings may be acceptable)

**Note:** The Xcode version issue is the primary blocker. The dSYM warnings might not prevent submission, but the Xcode version error will.

## Using EAS Build (Highly Recommended):

If you continue having issues with local builds, **EAS Build is highly recommended** because it handles all these issues automatically:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (first time)
eas build:configure

# Build for iOS (production)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

**EAS Build automatically handles:**
- ✅ Uses the correct Xcode version (release, not beta)
- ✅ Generates dSYM files for all frameworks
- ✅ Handles code signing and provisioning
- ✅ Validates the build before submission
- ✅ Includes all necessary symbols for crash reporting
- ✅ No local Xcode configuration needed

**This is the easiest solution** if you're having Xcode version or dSYM issues.

## Need Help?

If you continue to encounter issues:
1. Check Apple's release notes: https://developer.apple.com/news/releases
2. Verify your Apple Developer account status
3. Check Xcode release notes for known issues
4. Contact Apple Developer Support if submission is blocked

