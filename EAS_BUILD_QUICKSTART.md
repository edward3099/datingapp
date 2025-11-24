# EAS Build Quick Start

## Step 1: Install EAS CLI

**Option A: Install globally (requires sudo)**
```bash
sudo npm install -g eas-cli
```

**Option B: Use npx (no installation needed)**
```bash
# You can use npx to run EAS CLI without installing
npx eas-cli@latest [command]
```

**Option C: Install locally to project**
```bash
npm install --save-dev eas-cli
```

## Step 2: Login to Expo

```bash
# If installed globally:
eas login

# If using npx:
npx eas-cli@latest login

# If installed locally:
npx eas login
```

You'll be prompted to:
- Enter your Expo account email/password
- Or create a new account (free)
- Or login with Google/GitHub

## Step 3: Configure EAS Build

```bash
# If installed globally:
eas build:configure

# If using npx:
npx eas-cli@latest build:configure

# If installed locally:
npx eas build:configure
```

This creates `eas.json` with build profiles.

## Step 4: Build for Production

```bash
# If installed globally:
eas build --platform ios --profile production

# If using npx:
npx eas-cli@latest build --platform ios --profile production

# If installed locally:
npx eas build --platform ios --profile production
```

**This will:**
- Upload your project to Expo servers
- Build with correct Xcode version (not beta)
- Generate dSYM files automatically
- Create an `.ipa` file ready for App Store submission
- Take about 10-20 minutes

## Step 5: Submit to App Store

After the build completes:

```bash
# If installed globally:
eas submit --platform ios

# If using npx:
npx eas-cli@latest submit --platform ios

# If installed locally:
npx eas submit --platform ios
```

Or submit manually:
1. Go to https://expo.dev/accounts/[your-account]/projects/[your-project]/builds
2. Download the `.ipa` file
3. Upload to App Store Connect or use Xcode Organizer

## What Gets Fixed Automatically

✅ **Xcode Version**: Uses latest release (not beta)  
✅ **dSYM Files**: Generated automatically  
✅ **Code Signing**: Handled automatically  
✅ **Build Settings**: Optimized automatically  

## Next Steps

1. **Install EAS CLI** (choose one of the options above)
2. **Login**: `eas login` or `npx eas-cli@latest login`
3. **Configure**: `eas build:configure` or `npx eas-cli@latest build:configure`
4. **Build**: `eas build --platform ios --profile production`
5. **Submit**: `eas submit --platform ios` (after build completes)

## Quick Commands Reference

```bash
# Using npx (no installation)
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios

# If installed globally
eas login
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios

# If installed locally
npx eas login
npx eas build:configure
npx eas build --platform ios --profile production
npx eas submit --platform ios
```

## Troubleshooting

### Permission Error When Installing

If you get permission errors:
- **Option 1**: Use `npx eas-cli@latest [command]` (recommended)
- **Option 2**: Use `sudo npm install -g eas-cli`
- **Option 3**: Install locally: `npm install --save-dev eas-cli`

### Build Fails

Check build logs:
```bash
npx eas-cli@latest build:list
npx eas-cli@latest build:view [BUILD_ID]
```

### Need Help?

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- EAS CLI Docs: https://docs.expo.dev/eas/
- Expo Discord: https://chat.expo.dev/


