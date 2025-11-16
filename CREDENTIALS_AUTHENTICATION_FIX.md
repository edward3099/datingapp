# Fix: Apple ID Authentication Error

## Problem

The credentials setup is failing with:
```
Invalid username and password combination
```

## Solutions

### Solution 1: Use App-Specific Password (If 2FA is enabled)

If you have two-factor authentication enabled on your Apple ID, you need to use an **App-Specific Password** instead of your regular password.

#### Steps:

1. **Go to Apple ID website:**
   - Visit: https://appleid.apple.com
   - Sign in with your Apple ID

2. **Navigate to App-Specific Passwords:**
   - Go to "Sign-In and Security"
   - Find "App-Specific Passwords"
   - Click "Generate an app-specific password"

3. **Create a new password:**
   - Label it: "EAS Build" or "Expo"
   - Click "Create"
   - **Copy the password** (it looks like: `xxxx-xxxx-xxxx-xxxx`)

4. **Use this password in EAS Build:**
   - When prompted for password, use the app-specific password
   - NOT your regular Apple ID password

### Solution 2: Check Your Apple Developer Account

Make sure your Apple ID has an active Apple Developer account:

1. **Check Developer Account Status:**
   - Visit: https://developer.apple.com/account
   - Sign in with your Apple ID
   - Check if you have an active membership ($99/year)

2. **If you don't have a Developer Account:**
   - Sign up at: https://developer.apple.com/programs/
   - Pay the $99/year fee
   - Wait for account activation (usually instant)

### Solution 3: Verify Your Apple ID and Password

1. **Test your credentials:**
   - Try logging into: https://appleid.apple.com
   - Make sure your password is correct
   - Check if your account is locked or restricted

2. **Reset password if needed:**
   - Visit: https://appleid.apple.com
   - Click "Forgot Apple ID or password"
   - Follow the reset process

### Solution 4: Use Manual Credential Management

If automatic authentication keeps failing, you can configure credentials manually:

1. **Run credentials command:**
   ```bash
   npx eas-cli@latest credentials
   ```

2. **When prompted:**
   - Select **iOS**
   - Select **Production**
   - Choose **Manual** credential management (instead of Automatic)

3. **Provide your own certificates:**
   - You'll need to create certificates manually
   - More complex, but gives you more control

## Most Likely Solution

**If you have 2FA enabled**, use an **App-Specific Password** (Solution 1).

This is the most common issue. Apple requires app-specific passwords for automated tools like EAS Build when 2FA is enabled.

## Quick Steps to Fix

1. Go to: https://appleid.apple.com
2. Sign in
3. Go to "App-Specific Passwords"
4. Generate a new password
5. Copy the password
6. Run credentials setup again:
   ```bash
   npx eas-cli@latest credentials
   ```
7. When asked for password, paste the app-specific password

## After Fixing

Once authentication succeeds:
1. EAS Build will configure credentials automatically
2. Then we can proceed to Step 2: Build the app
3. Then Step 3: Submit to App Store

## Need Help?

- Apple ID Help: https://support.apple.com/apple-id
- App-Specific Passwords: https://support.apple.com/en-us/102654
- Apple Developer Support: https://developer.apple.com/support/

## Next Steps

1. **Try Solution 1 first** (App-Specific Password)
2. If that doesn't work, check your Developer account (Solution 2)
3. If still failing, verify your credentials (Solution 3)
4. As last resort, use manual credentials (Solution 4)

---

**Ready to try again?**
Run: `npx eas-cli@latest credentials`

Make sure to use an **App-Specific Password** if you have 2FA enabled!

