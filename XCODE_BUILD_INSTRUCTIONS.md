# Build with Xcode Instead of EAS Build

## Option: Build Locally in Xcode (No EAS Credentials Needed)

If you prefer to build in Xcode directly, here's how:

## Prerequisites

1. **Release Version of Xcode** (NOT beta)
   - Current release: Xcode 16.1 or latest stable
   - NOT: Xcode 16.1 Beta or any beta version

2. **Apple Developer Account**
   - Paid account ($99/year)
   - Already signed into Xcode

## Step 1: Check Your Xcode Version

```bash
xcodebuild -version
```

**If you see "beta" or "Beta" in the output:**
- You need to download a release version
- See: `XCODE_DOWNLOAD_GUIDE.md`

## Step 2: Open Project in Xcode

```bash
# Generate Xcode project (if not already done)
npx expo prebuild --platform ios

# Open in Xcode
open ios/ExpoGoApp.xcworkspace
```

## Step 3: Configure Signing in Xcode

1. **Select the project** in Xcode navigator (left side)
2. **Select the target** "ExpoGoApp"
3. **Go to "Signing & Capabilities" tab**
4. **Check "Automatically manage signing"**
5. **Select your Team** (your Apple Developer account)
6. **Bundle Identifier** should be: `com.expo.goapp`

Xcode will automatically:
- Create certificates
- Create provisioning profiles
- Sign the app

## Step 4: Build for App Store

1. **Select "Any iOS Device"** as the destination (not simulator)
2. **Go to Product > Archive**
3. **Wait for archive to complete** (5-15 minutes)
4. **Window opens with your archive**

## Step 5: Upload to App Store

1. In the archive window, click **"Distribute App"**
2. Select **"App Store Connect"**
3. Click **"Next"**
4. Select **"Upload"**
5. Click **"Next"**
6. Review options, click **"Upload"**
7. Wait for upload to complete

## Advantages of This Approach

✅ No EAS credential setup needed  
✅ Direct control over the build process  
✅ See build errors immediately  
✅ Xcode handles code signing automatically  

## Important: dSYM Files

If you still get dSYM warnings:

1. **In Xcode:**
   - Project settings > Build Settings
   - Search for "Debug Information Format"
   - Set to: **"DWARF with dSYM File"**

2. **For Release builds:**
   - Product > Scheme > Edit Scheme
   - Build Configuration: **Release**
   - Make sure dSYM is enabled

## Troubleshooting

### "No signing certificate found"
- Go to Xcode > Settings > Accounts
- Sign in with your Apple ID
- Select your team

### "Provisioning profile not found"
- Xcode should create this automatically
- If not, check "Automatically manage signing" is checked

### Still getting Xcode version errors
- Make sure you're using a RELEASE version (not beta)
- Check: `xcodebuild -version`
- Should NOT say "beta"

## Quick Commands

```bash
# Check Xcode version
xcodebuild -version

# Generate iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/ExpoGoApp.xcworkspace
```

## Next Steps

1. Check your Xcode version
2. If beta, download release version
3. Open project in Xcode
4. Configure signing (automatic)
5. Archive and upload

---

**Want to use this approach?** It's simpler if you have the right Xcode version!

