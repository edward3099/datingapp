#!/bin/bash

# EAS Build - Step 1: Configure iOS Credentials
# This script will guide you through setting up credentials

echo "=========================================="
echo "EAS Build - Step 1: Configure Credentials"
echo "=========================================="
echo ""
echo "This will configure iOS credentials for your app."
echo ""
echo "What you'll need:"
echo "  - Apple ID (email address)"
echo "  - Apple ID password"
echo "  - Apple Developer account (paid $99/year)"
echo ""
echo "When prompted:"
echo "  1. Select 'iOS' (use arrow keys, press Enter)"
echo "  2. Select 'Production' profile"
echo "  3. Choose 'Automatic' credential management (recommended)"
echo "  4. Enter your Apple ID and password"
echo "  5. Follow any additional prompts"
echo ""
echo "Starting credentials setup..."
echo ""

# Run the credentials command
npx eas-cli@latest credentials

echo ""
echo "=========================================="
echo "Credentials setup complete!"
echo "=========================================="
echo ""
echo "Next step: Run the build command"
echo "  npx eas-cli@latest build --platform ios --profile production"
echo ""

