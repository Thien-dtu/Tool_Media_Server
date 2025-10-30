# Platform ID Integration Guide

This guide shows how to integrate the new platform_id system into your application controllers.

## Overview

The system now supports using Facebook UID and Instagram UUID as primary identifiers while maintaining backward compatibility with usernames.

### Key Features

1. **Dual-Key Lookup**: Try platform_id first, fall back to username
2. **Auto-Migration**: Users are automatically migrated when platform_id is available
3. **Backward Compatible**: Old code using username-only continues to work
4. **Gradual Migration**: No need to migrate all users at once

## How It Works

### Database Flow

```
┌─────────────────────────────────────────────────────────┐
│  New API Call with platform_id                         │
│  { username, platform, platform_id, platform_url }     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  db.getOrCreateUser(userData)                          │
│  1. Try to find by platform_id                         │
│  2. Fall back to username                               │
│  3. If found and platform_id missing → UPDATE          │
│  4. If not found → CREATE with all data                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  User Record (with platform_id populated)              │
│  Future lookups will use platform_id                    │
└─────────────────────────────────────────────────────────┘
```

## Integration Steps

### Step 1: Extract platform_id from API Response

Update your API response handling to extract platform_id:

```javascript
// Example: Facebook API response
const result = {
    id: "100010817016408",
    uid: "100010817016408",
    name: "Quach Trang",
    username: "trang.quach.526875",
    // ... other fields
};

// Extract data
const userData = {
    username: result.username || extractUsernameFromUrl(url),
    platform: 'facebook',  // or 'instagram'
    platform_id: result.uid,
    platform_url: url
};
```

### Step 2: Update Controller to Pass platform_id

**Before:**
```javascript
const { readSavedList, writeSavedList } = require('../utils/fileUtils');

// Old way - username only
const savedList = readSavedList();
savedList.push({ username: 'user123', id: 'media_id' });
writeSavedList(savedList);
```

**After:**
```javascript
const { getDatabase } = require('../database/db');

// New way - with platform_id
const db = getDatabase();
await db.connect();

await db.saveMedia({
    username: 'user123',
    platform: 'facebook',
    platform_id: '100010817016408',
    platform_url: 'https://www.facebook.com/user123'
}, 'media_id');

db.close();
```

### Step 3: Update Download Controller Example

```javascript
// src/controllers/downloadController.js

const { getDatabase } = require('../database/db');
const { detectPlatform, extractUsernameFromUrl } = require('../utils/platformIdUtils');

const handleDownload = async (req, res) => {
    const { results, originalUrl, apiName } = req.body;

    // ... existing validation ...

    const db = getDatabase();
    await db.connect();

    try {
        const newSavedItems = [];

        for (const item of results) {
            // Extract user data with platform_id if available
            const userData = {
                username: item.username,
                platform: detectPlatform(item.url || originalUrl),
                platform_id: item.uid || item.id,  // Use uid if available
                platform_url: item.url || originalUrl
            };

            // Download media...

            // Save to database (auto-migrates if platform_id available)
            if (!mediaItem.isCarouselChild && downloadCount > 0) {
                await db.saveMedia(userData, item.id);
            }
        }

    } finally {
        db.close();
    }

    // ... rest of handler ...
};
```

## API Response Patterns

### Facebook API Response

```javascript
{
    "type": "user",
    "id": "100010817016408",
    "uid": "100010817016408",  // ← Use this as platform_id
    "name": "Quach Trang",
    "avatar": "https://...",
    "url": "https://www.facebook.com/trang.quach.526875"
}
```

### Instagram API Response

```javascript
{
    "id": "17620207550",
    "uid": "17620207550",  // ← Use this as platform_id
    "name": "Quach Trang",
    "username": "chanz_sweet.052",  // ← Also capture username
    "type": "ig_user",
    "url": "https://www.instagram.com/chanz_sweet.052"
}
```

## Migration Strategies

### Strategy 1: Automatic Migration (Recommended)

**How:** Platform_id is automatically populated when available in API responses.

**When to use:**
- Default approach
- No manual work needed
- Works transparently

**Example:**
```javascript
// Just pass all available data
const userData = {
    username: result.username,
    platform: 'instagram',
    platform_id: result.uid,  // Will auto-migrate if missing
    platform_url: result.url
};

await db.saveMedia(userData, mediaId);
```

### Strategy 2: Background Migration

**How:** Run migration script to fetch platform_id for existing users.

**When to use:**
- Want to migrate important users immediately
- Need complete migration for reporting
- Have time to run background job

**Example:**
```bash
# Migrate top 50 users
node database/migrate-platform-ids.js --limit 50

# Dry run to see what would be migrated
node database/migrate-platform-ids.js --dry-run

# Migrate all users (respects rate limits)
node database/migrate-platform-ids.js --limit 1000
```

### Strategy 3: On-Demand Migration

**How:** Fetch platform_id when user is accessed and it's missing.

**When to use:**
- User-triggered actions
- Want to minimize API calls
- Only care about active users

**Example:**
```javascript
const { autoFetchPlatformId } = require('../utils/platformIdUtils');

// Check if user needs migration
const user = await db.getUser(username);
if (!user.platform_id) {
    // Fetch platform_id
    const url = `https://www.instagram.com/${username}`;
    const result = await autoFetchPlatformId(url, clientId);

    if (result) {
        await db.updateUserPlatformId(
            username,
            result.platform,
            result.uid,
            url
        );
    }
}
```

## Monitoring Migration Progress

### Check Migration Status

```javascript
const { getDatabase } = require('./database/db');

const db = getDatabase();
await db.connect();

const progress = await db.getMigrationProgress();
console.log(`Migration: ${progress.migration_percent}%`);
console.log(`Migrated: ${progress.migrated_users}/${progress.total_users}`);
console.log(`Pending: ${progress.pending_users}`);

db.close();
```

### SQL Query

```sql
SELECT * FROM v_migration_progress;
```

Returns:
```
total_users | migrated_users | pending_users | migration_percent
    287     |       45       |      242      |      15.68
```

### Get Users Needing Migration

```javascript
const usersToMigrate = await db.getUsersNeedingMigration(10);
console.log('Top 10 users needing migration:', usersToMigrate);
```

## Backward Compatibility

### Old Code Continues to Work

```javascript
// This still works (username-only)
await db.saveMedia('user123', 'media_id');

// Internally, it converts to:
await db.saveMedia({ username: 'user123' }, 'media_id');
```

### Gradual Migration Path

1. **Week 1:** Deploy platform_id support (no changes needed)
2. **Week 2-4:** New data automatically includes platform_id
3. **Month 2:** Run background migration for important users
4. **Month 3+:** 80%+ users will have platform_id naturally

## Best Practices

### 1. Always Pass Available Data

```javascript
// ✅ Good - Pass all available data
const userData = {
    username: result.username,
    platform: detectPlatform(url),
    platform_id: result.uid || result.id,
    platform_url: url
};
await db.saveMedia(userData, mediaId);

// ❌ Bad - Only passing username when more data is available
await db.saveMedia(result.username, mediaId);
```

### 2. Handle Missing platform_id Gracefully

```javascript
// ✅ Good - Optional platform_id
const userData = {
    username: result.username,
    platform: result.platform || detectPlatform(url),
    platform_id: result.uid || null,  // OK if null
    platform_url: url
};

// ❌ Bad - Throwing error if platform_id missing
if (!result.uid) throw new Error('UID required');
```

### 3. Use Proper Platform Detection

```javascript
const { detectPlatform, detectPlatformFromApiName } = require('../utils/platformIdUtils');

// ✅ Good - Detect from URL or API name
const platform = detectPlatform(url) || detectPlatformFromApiName(apiName);

// ❌ Bad - Hardcoding platform
const platform = 'facebook';  // What if it's Instagram?
```

## Troubleshooting

### Issue: Users not migrating

**Check:**
1. Is platform_id being passed to `saveMedia()` or `getOrCreateUser()`?
2. Is the API response actually returning UID/UUID?
3. Are you using the new database methods?

**Solution:**
```javascript
// Add logging to see what data is being passed
console.log('Saving media with userData:', userData);
await db.saveMedia(userData, mediaId);
```

### Issue: Duplicate users

**Cause:** User exists with username but new entry created with platform_id.

**Prevention:** Always use `getOrCreateUser()` which checks both.

**Fix:**
```javascript
// The database wrapper handles this automatically
// It will find existing user and update platform_id
```

### Issue: Rate limiting during background migration

**Solution:**
```javascript
// Adjust delays in migrate-platform-ids.js
const DELAY_BETWEEN_BATCHES = 10000;  // Increase to 10 seconds
const DELAY_BETWEEN_REQUESTS = 2000;  // Increase to 2 seconds
```

## Testing

### Test Auto-Migration

```javascript
// 1. Create user without platform_id
await db.saveMedia('test_user', 'media_1');

// 2. Later, same user with platform_id
await db.saveMedia({
    username: 'test_user',
    platform: 'instagram',
    platform_id: '17620207550',
    platform_url: 'https://www.instagram.com/test_user'
}, 'media_2');

// 3. Verify migration
const user = await db.getUser('test_user');
console.log(user.platform_id);  // Should be '17620207550'
```

### Test Dual Lookup

```javascript
// Should find same user both ways
const user1 = await db.getUser('test_user');
const user2 = await db.getUser('17620207550', 'instagram');

console.log(user1.id === user2.id);  // Should be true
```

## Next Steps

1. ✅ Apply database migration: `node database/apply-migration.js`
2. ✅ Update controllers to pass platform_id
3. ✅ Test with sample data
4. ✅ Deploy changes
5. ✅ Monitor migration progress
6. ✅ Optionally run background migration

For questions or issues, refer to the database README or the main documentation.
