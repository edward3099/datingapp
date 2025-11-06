#!/bin/bash
# Helper script to upload screens
# Usage: ./upload-screens.sh /path/to/your/images

echo "Screens upload helper"
echo "===================="
echo ""
echo "To upload screens, you can:"
echo "1. Drag and drop images into the screens/ folder in Cursor's file explorer"
echo "2. Use the file upload feature in Cursor web"
echo "3. If you have images in a specific location, run:"
echo "   cp /path/to/your/images/*.png screens/"
echo ""
echo "Current screens directory: $(pwd)/screens"
echo ""
ls -la screens/ 2>/dev/null || echo "No files in screens directory yet"
