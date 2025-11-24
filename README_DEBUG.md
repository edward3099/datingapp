# 🐛 Debugging Guide

This app now includes comprehensive debugging tools to help identify and fix errors easily.

## Quick Access

### Method 1: Dev Menu (Easiest)
1. **Triple-tap the small blue dot** in the top-right corner of any screen
2. Select "📊 View Debug Console" from the menu
3. View all errors, warnings, and logs in real-time

### Method 2: Direct Navigation
You can navigate directly to the Debug screen by calling:
```javascript
navigation.navigate('Debug');
```

## Features

### 1. Error Boundary
- Automatically catches React component errors
- Displays a user-friendly error screen with:
  - Error message
  - Stack trace
  - Component stack
  - "Try Again" button

### 2. Debug Console
- Real-time log viewing
- Filter logs by keyword
- View errors, warnings, and info logs
- See timestamps and full error details
- Clear logs button

### 3. Enhanced Logging
All errors are automatically logged with:
- Timestamp
- Error message
- Stack trace
- Component context

## How to Use

### When You See an Error:

1. **Check the Error Boundary Screen**
   - If the app crashes, you'll see a red error screen
   - Copy the error message and stack trace

2. **Open Debug Console**
   - Triple-tap the blue dot → "View Debug Console"
   - Look for red ERROR entries
   - Check the timestamp to see when it occurred

3. **Filter Logs**
   - Use the search box to filter by error type or keyword
   - Example: search "navigation" to see all navigation-related errors

4. **Share Error Details**
   - Copy the error message from Debug Console
   - Or take a screenshot of the Error Boundary screen

## Logging in Your Code

You can add custom logging anywhere:

```javascript
import { logger } from '../utils/logger';

// Log an error
logger.error('Something went wrong', { userId: 123, action: 'login' });

// Log a warning
logger.warn('Deprecated API used', { api: 'oldFunction' });

// Log info
logger.info('User logged in', { userId: 123 });

// Debug (only in development)
logger.debug('Component rendered', { props });
```

## Accessing Logs Programmatically

```javascript
import { logger } from '../utils/logger';

// Get all logs
const allLogs = logger.getLogs();

// Get only errors
const errors = logger.getErrors();

// Access via global (for debugging)
console.log(global.__EXPO_LOGS__);
```

## Common Error Types

### Navigation Errors
- **Symptom**: "The action 'NAVIGATE' with payload... was not handled"
- **Solution**: Check that the screen name exists in AppNavigator.js

### Animation Errors
- **Symptom**: "JS driven animation on animated node..."
- **Solution**: Ensure animations are stopped before starting new ones

### Module Errors
- **Symptom**: "Cannot find module..."
- **Solution**: Check package.json and run `npm install`

## Tips

- The Debug Console updates every second automatically
- Logs are stored in memory (max 100 entries)
- Errors are also logged to the terminal/console
- Use the filter to quickly find specific errors
