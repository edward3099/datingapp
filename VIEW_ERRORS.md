# How to View Captured Errors - Method 2 (Console/Debugger)

## Quick Commands

Open your **Expo console** or **React Native debugger** and run:

### Option 1: Simple Error Display
```javascript
showErrors()
```
This will display all captured errors in a formatted report.

### Option 2: Get Errors Array
```javascript
logger.getErrors()
```
Returns an array of all error logs.

### Option 3: Full Detailed Report
```javascript
viewCapturedErrors()
```
Shows complete error report with all details.

### Option 4: Print to Console
```javascript
printErrorsToConsole()
```
Formatted error list in console.

### Option 5: Export All Logs
```javascript
exportLogsToFile()
```
Exports all logs (errors, warnings, info) to console and file.

## Expected Errors Based on Code Analysis

Based on the codebase analysis, you might see these errors:

### 1. **RPC Function Errors** (Most Likely)
- `get_recommendations` - Function might not exist in Supabase
- `get_matches_with_last_message` - Function might not exist
- `get_conversation_messages` - Function might not exist  
- `get_unread_message_count` - Function might not exist
- `check_rate_limit` - Function might not exist
- `mark_conversation_read` - Function might not exist

**Error Message Example:**
```
"function \"get_recommendations\" does not exist"
"Could not find a function matching the name and argument types"
```

### 2. **Database Query Errors**
- Missing tables (profiles, matches, messages, etc.)
- RLS (Row Level Security) policy violations
- Foreign key constraint errors

**Error Message Example:**
```
"relation \"profiles\" does not exist"
"new row violates row-level security policy"
```

### 3. **Authentication Errors**
- Profile not auto-created on signup
- Session expired
- Invalid credentials

**Error Message Example:**
```
"Load profile error"
"Profile not found"
```

### 4. **Storage Errors**
- Storage buckets not created (avatars, gallery)
- Permission denied for storage access

**Error Message Example:**
```
"The resource was not found"
"new row violates row-level security policy for table \"storage.objects\""
```

### 5. **Network Errors**
- Connection timeout
- API errors
- Network request failed

## Step-by-Step: View Errors Now

1. **Open Expo Console:**
   - If using Expo Go, shake device and select "Debug Remote JS"
   - Or open Chrome DevTools if using Expo web
   - Or use React Native Debugger

2. **Run this command:**
   ```javascript
   showErrors()
   ```

3. **Or get just the errors:**
   ```javascript
   const errors = logger.getErrors();
   console.log('Total errors:', errors.length);
   errors.forEach((err, i) => {
     console.log(`${i+1}. ${err.message}`);
     console.log('   Time:', err.timestamp);
     console.log('   Data:', err.data);
   });
   ```

4. **View all logs:**
   ```javascript
   const logs = logger.getLogs();
   console.log('All logs:', logs);
   ```

## Global Access

All these are available globally in your app:
- `global.logger` - Direct logger access
- `global.showErrors` - Display errors function
- `global.viewCapturedErrors` - Full report function
- `global.__EXPO_LOGS__` - Direct log array access

## Next Steps After Viewing Errors

Once you see the errors:

1. **If RPC function errors:** Create the missing functions in Supabase
2. **If database errors:** Check tables exist and RLS policies are set
3. **If storage errors:** Create storage buckets
4. **If auth errors:** Check profile creation trigger

Let me know what errors you see and I'll help fix them!

