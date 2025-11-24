# EAS Build - Complete Setup Guide

## ✅ What's Already Done

1. **EAS Project Created**: ✅
   - Project ID: `52113438-ce0d-4142-ba3b-61a15038168d`
   - Project: `@iatsj/expo-go-app`
   - Owner: `iatsj`

2. **EAS Configuration**: ✅
   - `eas.json` created with production profile
   - iOS build configured for App Store submission

3. **Build Command Prepared**: ✅
   - Ready to build for iOS production

## ⚠️ What Needs to Be Done

### Step 1: Configure iOS Credentials (REQUIRED)

EAS Build needs your Apple Developer credentials to sign the app. You have two options:

#### Option A: Automatic Credential Management (Recommended)

EAS Build can automatically manage your credentials:

```bash
# Configure credentials interactively
npx eas-cli@latest credentials
```

**When prompted:**
1. Select **iOS** platform
2. Select **Production** profile
3. Choose **Automatic** credential management
4. Enter your Apple ID and password
5. EAS Build will handle the rest

#### Option B: Manual Credential Management

If you already have certificates and provisioning profiles:

```bash
# Configure credentials manually
npx eas-cli@latest credentials:configure -p ios
```

**What you'll need:**
- Apple Developer account (paid $99/year)
- Distribution certificate
- App Store provisioning profile

### Step 2: Start the Build

After credentials are configured:

```bash
# Build for iOS production
npx eas-cli@latest build --platform ios --profile production
```

**This will:**
- Upload your project to Expo servers
- Build with correct Xcode version (not beta)
- Generate dSYM files automatically
- Sign the app with your credentials
- Create `.ipa` file ready for App Store submission
- Take about 10-20 minutes

### Step 3: Monitor Build Progress

```bash
# Check build status
npx eas-cli@latest build:list

# View specific build
npx eas-cli@latest build:view [BUILD_ID]
```

**Or check the dashboard:**
- Visit: https://expo.dev/accounts/iatsj/projects/expo-go-app/builds

### Step 4: Submit to App Store

After build completes:

```bash
# Submit to App Store
npx eas-cli@latest submit --platform ios --latest
```

**Or submit manually:**
1. Go to: https://expo.dev/accounts/iatsj/projects/expo-go-app/builds
2. Download the `.ipa` file
3. Upload to App Store Connect:
   - Use Xcode Organizer (Product > Distribute App)
   - Or use App Store Connect web interface
   - Or use Transporter app

## Complete Commands

### 1. Configure Credentials (REQUIRED FIRST)
```bash
npx eas-cli@latest credentials
```

### 2. Build for Production
```bash
npx eas-cli@latest build --platform ios --profile production
```

### 3. Submit to App Store
```bash
npx eas-cli@latest submit --platform ios --latest
```

## What Gets Fixed Automatically

✅ **Xcode Version**: Uses latest release (not beta)  
✅ **dSYM Files**: Generated automatically for all frameworks  
✅ **Code Signing**: Handled automatically (after credentials setup)  
✅ **Build Settings**: Optimized automatically  
✅ **React Native Frameworks**: dSYMs generated correctly  

## Credentials Setup Details

### What EAS Build Needs:

1. **Apple Developer Account**: 
   - Must have a paid Apple Developer account ($99/year)
   - Account must have App Store Connect access

2. **Distribution Certificate**:
   - EAS Build can generate this automatically
   - Or you can provide an existing one

3. **Provisioning Profile**:
   - EAS Build can generate this automatically
   - Or you can provide an existing one

### Automatic vs Manual:

**Automatic (Recommended):**
- EAS Build generates certificates and profiles
- Handles renewal automatically
- Easier to set up
- Works for most cases

**Manual:**
- You provide your own certificates
- More control over credentials
- Useful for enterprise setups
- More complex to set up

## Troubleshooting

### Credentials Setup Fails

1. **Check Apple Developer Account:**
   - Ensure you have a paid Apple Developer account
   - Verify account has App Store Connect access
   - Check if account is active

2. **Check Credentials:**
   ```bash
   npx eas-cli@latest credentials:list -p ios
   ```

3. **Reset Credentials:**
   ```bash
   npx eas-cli@latest credentials:reset -p ios
   ```

### Build Fails

1. **Check build logs:**
   ```bash
   npx eas-cli@latest build:list
   npx eas-cli@latest build:view [BUILD_ID]
   ```

2. **Common issues:**
   - Missing credentials → Run `npx eas-cli@latest credentials`
   - Code signing issues → Run `npx eas-cli@latest credentials:configure -p ios`
   - Dependency errors → Check `package.json` and `app.json`

### Need Help?

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- EAS CLI Docs: https://docs.expo.dev/eas/
- Credentials Docs: https://docs.expo.dev/app-signing/app-credentials/
- Expo Discord: https://chat.expo.dev/

## Summary

**What's Done:**
✅ EAS project created  
✅ Build configuration complete  
✅ Ready to build  

**What's Next:**
1. **Configure credentials** (REQUIRED):
   ```bash
   npx eas-cli@latest credentials
   ```

2. **Start build**:
   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

3. **Submit to App Store**:
   ```bash
   npx eas-cli@latest submit --platform ios --latest
   ```

**Estimated Time:**
- Credentials setup: 5-10 minutes
- Build: 10-20 minutes
- Submission: 5-10 minutes
- **Total**: 20-40 minutes

## Expected Results

### Before (Local Build with Beta Xcode):
- ❌ Validation failed: Unsupported SDK or Xcode version
- ❌ Archive rejected by App Store Connect
- ❌ Cannot submit to App Store

### After (EAS Build):
- ✅ Build uses correct Xcode version (not beta)
- ✅ dSYM files generated automatically
- ✅ Archive accepted by App Store Connect
- ✅ Can submit to App Store
- ⚠️ May still see dSYM warnings (these may not block submission)

## Next Steps

1. **Run credentials setup:**
   ```bash
   npx eas-cli@latest credentials
   ```

2. **Start build:**
   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

3. **Monitor build:**
   - Check dashboard: https://expo.dev/accounts/iatsj/projects/expo-go-app/builds
   - Or use: `npx eas-cli@latest build:list`

4. **Submit after build completes:**
   ```bash
   npx eas-cli@latest submit --platform ios --latest
   ```

## Need Help?

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Credentials Docs: https://docs.expo.dev/app-signing/app-credentials/
- Expo Discord: https://chat.expo.dev/
- Build Dashboard: https://expo.dev/accounts/iatsj/projects/expo-go-app/builds


