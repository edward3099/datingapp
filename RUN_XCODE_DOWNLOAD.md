# Download Xcode - Run This Command Manually

## Run This in Your Terminal

Open your **Terminal app** directly (not through me), then run:

```bash
cd /Users/bb/datingapp
xcodes install 16.4
```

## When Prompted

1. **Apple ID**: Type `nanaagyei06@outlook.com` (or your preferred Apple ID)
   - Press **Enter**

2. **Password**: 
   - Type your password (you won't see it on screen - this is normal)
   - If you have 2FA enabled, use an **App-Specific Password** instead
   - Press **Enter**

## If Password Doesn't Work

Create an App-Specific Password:

1. Go to: https://appleid.apple.com
2. Sign in
3. Go to **"App-Specific Passwords"**
4. Click **"Generate an app-specific password"**
5. Label it: `Xcode Download`
6. Copy the password (looks like: `xxxx-xxxx-xxxx-xxxx`)
7. Use that password when prompted

## After Download Starts

- The download is large (~10-15 GB), so it will take time
- You'll see progress updates
- Once downloaded, Xcode will be automatically installed to `/Applications/Xcode-16.4.app`

## Switch to Downloaded Xcode

After installation, switch to it:

```bash
xcodes select 16.4
```

Or:

```bash
sudo xcode-select -s /Applications/Xcode-16.4.app
```

## Verify It Worked

Check your Xcode version:

```bash
xcodebuild -version
```

Should show: `Xcode 16.4` (NOT "Beta")

## Alternative: Download Latest Release (26.1)

If you want the latest release version instead:

```bash
xcodes install 26.1
```

---

**Important**: Run the command directly in your Terminal app so you can type your password without interruptions.

