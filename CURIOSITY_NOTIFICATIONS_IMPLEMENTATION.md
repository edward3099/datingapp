# ✅ Curiosity-Driven Notifications Implementation

## 🎯 Overview

Implemented a notification system that creates curiosity and drives engagement through 4 priority-based notification types, limited to 3 per day.

---

## 📊 Notification Types (Priority Order)

### 1. "Someone special viewed you" (Priority: 100)
**Trigger**: Someone who:
- Super liked the user, OR
- Shares 2+ interests with the user

**Message**: "Someone special viewed you" + "Find out who"

### 2. "Someone who shares your interest in X viewed you" (Priority: 95)
**Trigger**: Someone who:
- Viewed the user's profile
- Shares at least 1 interest with the user

**Message**: "Someone who shares your interest viewed you" + "Someone who likes [interest] viewed your profile"

### 3. "Someone nearby viewed your profile" (Priority: 90)
**Trigger**: Someone who:
- Viewed the user's profile
- Is within 50km of the user (location-based)

**Message**: "Someone nearby viewed your profile" + "Find out who"

### 4. "Someone is viewing your profile right now" (Priority: 85)
**Trigger**: Someone who:
- Viewed the user's profile in the last 5 minutes
- Is currently active (last_active within 10 minutes)

**Message**: "Someone is viewing your profile right now" + "See who"

---

## 🗄️ Database Schema

### `profile_views` Table
Tracks when users view profiles:
- `viewer_id`: Who viewed
- `viewed_id`: Whose profile was viewed
- `viewed_at`: When it was viewed
- `view_duration`: How long they viewed (seconds)
- `source`: Where the view came from ('swipe', 'profile_detail', etc.)

### `notification_daily_limits` Table
Tracks daily notification limits:
- `user_id`: User
- `date`: Date
- `addictive_notifications_sent`: Count (max 3)
- `last_addictive_notification_at`: Last sent time
- `slot_1_sent`, `slot_2_sent`, `slot_3_sent`: Time slot tracking

---

## 🔧 Implementation

### 1. Profile View Tracking
- **Location**: `services/viewService.js`
- **Function**: `trackProfileView(viewedProfileId, options)`
- **When tracked**:
  - When profile card is displayed for 3+ seconds
  - When user swipes on a profile

### 2. Notification Selection
- **Location**: SQL function `get_best_curiosity_notification(user_id, time_slot)`
- **Logic**: Returns highest priority notification available
- **Filters**: Excludes already-swiped profiles, respects daily limits

### 3. Daily Limits
- **Max**: 3 addictive notifications per day
- **Standard notifications** (matches, messages) don't count
- **Time slots**: Morning (8-10 AM), Peak (6-9 PM), Evening (9-11 PM)

---

## 📱 Usage

### Track Profile View
```javascript
import { viewService } from '../services/viewService';

// Track when user views a profile
await viewService.trackProfileView(profileId, {
  source: 'swipe',
  duration: 3, // seconds
});
```

### Get Best Notification
```javascript
// Get best notification for current time slot
const { notification, error } = await viewService.getBestCuriosityNotification('peak');

if (notification) {
  // Send push notification
  // notification.title: "Someone special viewed you"
  // notification.body: "Find out who"
  // notification.data: { viewer_id, viewed_at, ... }
}
```

### Mark Notification Sent
```javascript
// After sending notification, mark it as sent
await viewService.markNotificationSent(notification.notification_type);
```

---

## 🎮 Notification Flow

1. **User views profiles** → Tracked in `profile_views`
2. **Notification system checks** → Every hour or on schedule
3. **Select best notification** → Based on priority (100 → 85)
4. **Check daily limit** → Max 3 per day
5. **Send notification** → Push notification to user
6. **Mark as sent** → Update daily limit counter

---

## ⚙️ Configuration

### Time Slots
- **Morning**: 8:00 AM - 10:00 AM
- **Peak Hours**: 6:00 PM - 9:00 PM
- **Evening**: 9:00 PM - 11:00 PM

### View Tracking
- **Minimum duration**: 3 seconds (meaningful view)
- **Source types**: 'swipe', 'profile_detail', 'search'
- **Duplicate prevention**: One view per hour per viewer

### Notification Rules
- **Max per day**: 3 addictive notifications
- **Min time between**: 4 hours
- **Quiet hours**: 11 PM - 7 AM (no notifications)
- **Skip if**: User opened app in last 30 minutes

---

## 🚀 Next Steps

1. **Schedule notification checks** (cron job or scheduled function)
2. **Integrate with push notifications** (Expo push notification service)
3. **Add notification preferences** (user can disable specific types)
4. **A/B test notification copy** (test different messages)
5. **Track notification effectiveness** (open rates, engagement)

---

## ✅ Status

**Core implementation complete!** 🎉

- ✅ Profile view tracking
- ✅ Notification selection algorithm
- ✅ Daily limit enforcement
- ✅ 4 curiosity notification types
- ✅ View tracking in swipe screen

**Ready for**: Notification scheduling and push notification integration.

