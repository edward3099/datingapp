# Step 1: Configure iOS Credentials - Instructions

## What You Need

1. **Apple ID** (your email address)
2. **Apple ID Password**
3. **Apple Developer Account** (paid $99/year membership)
4. **2FA Code** (if two-factor authentication is enabled)

## Step-by-Step Instructions

### 1. Run the Command

I'll run this command for you. When it starts, you'll see prompts in your terminal.

### 2. Follow These Prompts

When the command runs, you'll be asked:

1. **"Select platform"**
   - Use the **↓ arrow key** to select **iOS**
   - Press **Enter**

2. **"Select build profile"**
   - Use the **↓ arrow key** to select **Production**
   - Press **Enter**

3. **"How would you like to manage your credentials?"**
   - Select **Automatic** (recommended)
   - Press **Enter**

4. **"Enter your Apple ID"**
   - Type your Apple ID email address
   - Press **Enter**

5. **"Enter your Apple ID password"**
   - Type your Apple ID password (it won't show on screen)
   - Press **Enter**

6. **If you have 2FA enabled:**
   - You'll be asked for a verification code
   - Check your trusted device for the code
   - Enter the code
   - Press **Enter**

7. **Wait for setup to complete**
   - EAS Build will create certificates and provisioning profiles
   - This may take 1-2 minutes
   - You'll see "Credentials configured successfully"

## Important Notes

- Your password won't be visible when typing (this is normal)
- If you have 2FA, you'll need to approve on a trusted device
- EAS Build will automatically create all necessary certificates
- The setup only needs to be done once

## What Happens Next

After credentials are configured:
1. Step 2: Build the app (automatic)
2. Step 3: Submit to App Store (automatic)

## Troubleshooting

### "Invalid Apple ID or password"
- Double-check your Apple ID and password
- Make sure you're using the correct Apple ID

### "Apple Developer account not found"
- You need a paid Apple Developer account ($99/year)
- Sign up at: https://developer.apple.com/programs/

### "2FA verification failed"
- Make sure you're entering the code correctly
- Check your trusted device for the latest code
- Try again if it expires

## Ready?

The command will run now. Follow the prompts above!

