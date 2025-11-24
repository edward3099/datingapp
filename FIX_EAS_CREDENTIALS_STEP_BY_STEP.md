# Fix EAS Credentials - Step by Step Guide

## The Problem

EAS Build can't log in with your Apple ID because of authentication issues. This is usually because you have **Two-Factor Authentication (2FA)** enabled.

## The Solution: Use App-Specific Password

Apple requires an **App-Specific Password** for automated tools when 2FA is enabled.

## Step-by-Step Instructions

### Step 1: Create App-Specific Password

1. **Open your web browser**
2. **Go to:** https://appleid.apple.com
3. **Sign in** with your Apple ID:
   - Email: `antwijason55@gmail.com`
   - Password: (your regular password)
4. **If prompted for 2FA code:**
   - Check your iPhone/iPad/Mac for the code
   - Enter it

5. **After signing in:**
   - Scroll down or look for "Security" section
   - Find **"App-Specific Passwords"** (might be under "Sign-In and Security")
   - Click on it

6. **Generate a new password:**
   - Click **"Generate an app-specific password"** or **"Create App-Specific Password"**
   - Label it: `EAS Build` or `Expo Build`
   - Click **"Create"** or **"Generate"**

7. **Copy the password:**
   - It will look like: `xxxx-xxxx-xxxx-xxxx` (4 groups of 4 letters/numbers)
   - **IMPORTANT:** Copy this entire password (including the dashes)
   - You won't see it again, so save it somewhere safe

### Step 2: Use the App-Specific Password with EAS Build

1. **Open Terminal** (or use the command I'll run for you)

2. **Run the credentials command:**
   ```bash
   npx eas-cli@latest credentials
   ```

3. **When prompted:**
   - **Select platform:** Use arrow key to select `iOS`, press Enter
   - **Select profile:** Select `production`, press Enter
   - **Do you want to log in?:** Type `yes`, press Enter
   - **Apple ID:** Type `antwijason55@gmail.com`, press Enter
   - **Password:** **Paste the app-specific password** (the `xxxx-xxxx-xxxx-xxxx` one), press Enter

4. **Wait for setup to complete**
   - EAS Build will create certificates and provisioning profiles
   - Takes 1-2 minutes
   - You'll see "Credentials configured successfully"

### Step 3: After Credentials Are Set

Once credentials are configured, I'll automatically:
- Run the build command
- Monitor the build
- Guide you through App Store submission

## Visual Guide

### Where to Find App-Specific Passwords

1. Go to: https://appleid.apple.com
2. Sign in
3. Look for one of these:
   - **"Security"** section → **"App-Specific Passwords"**
   - **"Sign-In and Security"** → **"App-Specific Passwords"**
   - Direct link: https://appleid.apple.com/account/manage (then look for App-Specific Passwords)

### What the Password Looks Like

```
abcd-efgh-ijkl-mnop
```

It's 4 groups of 4 characters, separated by dashes.

## Common Issues

### "I can't find App-Specific Passwords"
- Make sure you're signed in with the correct Apple ID
- Check you have 2FA enabled (you need it to use app-specific passwords)
- Look in "Security" or "Sign-In and Security" section

### "The password doesn't work"
- Make sure you copied the ENTIRE password including dashes
- Don't add spaces
- Make sure you're pasting it, not typing it (to avoid typos)

### "I don't have 2FA enabled"
- Enable 2FA first: https://support.apple.com/en-us/102654
- Then create app-specific password

## Alternative: If You Can't Create App-Specific Password

If you absolutely cannot create an app-specific password, we can try:
- Manual credential setup (more complex)
- Contacting Apple Support for account issues

## Ready?

1. **First:** Create the app-specific password (Step 1 above)
2. **Then:** Let me know when you have it, and I'll run the credentials command again
3. **Finally:** When prompted, paste the app-specific password (not your regular password)

---

**I'm ready when you are!** Once you have the app-specific password, I'll run the credentials setup command again.

