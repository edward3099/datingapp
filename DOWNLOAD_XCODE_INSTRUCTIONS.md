# Download Xcode Release Version

## What's Happening

I'm about to download Xcode 16.4 (stable release version) using the `xcodes` command.

## When Prompted

The command will ask for:

1. **Apple ID**: Enter your Apple ID email address
   - If it shows a different email than you want, you can enter your preferred one

2. **Apple ID Password**: 
   - If you have **Two-Factor Authentication (2FA)** enabled, use an **App-Specific Password**
   - If you don't have 2FA, use your regular password

## App-Specific Password (If Needed)

If the password doesn't work, create an app-specific password:

1. Go to: https://appleid.apple.com
2. Sign in
3. Go to "App-Specific Passwords"
4. Create one labeled "Xcode Download"
5. Copy the password (format: `xxxx-xxxx-xxxx-xxxx`)
6. Use that when prompted

## After Download

Once downloaded:
- Xcode will be installed in `/Applications/Xcode-16.4.app`
- You can switch to it using: `sudo xcode-select -s /Applications/Xcode-16.4.app`
- Or use: `xcodes select 16.4`

## Ready?

The command will run now. When prompted, enter your credentials.

