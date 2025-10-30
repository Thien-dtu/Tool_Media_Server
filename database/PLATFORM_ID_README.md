# Platform ID Migration System

## Quick Start

### 1. Apply Database Migration

```bash
node database/apply-migration.js
```

This adds `platform`, `platform_id`, `platform_url`, and `migrated_at` columns to the users table.

### 2. Your App Automatically Migrates New Users

No code changes required! When you pass user data with `platform_id`, it's automatically stored:

```javascript
const { getDatabase } = require('./database/db');

const db = getDatabase();
await db.connect();

// Old way (still works)
await db.saveMedia('username', 'media_id');

// New way (auto-migrates)
await db.saveMedia({
    username: 'username',
    platform: 'instagram',
    platform_id: '17620207550',
    platform_url: 'https://www.instagram.com/username'
}, 'media_id');

db.close();
```

### 3. (Optional) Migrate Existing Users

```bash
# Migrate top 50 users
node database/migrate-platform-ids.js --limit 50

# See what would be migrated
node database/migrate-platform-ids.js --dry-run
```

## Files Created

| File | Purpose |
|------|---------|
| `migrations/001_add_platform_ids.sql` | SQL migration script |
| `apply-migration.js` | Applies migration to database |
| `migrate-platform-ids.js` | Background worker to fetch missing UIDs/UUIDs |
| `PLATFORM_ID_README.md` | This file |
| `../src/utils/platformIdUtils.js` | Utilities to fetch UID/UUID from APIs |
| `../docs/PLATFORM_ID_INTEGRATION.md` | Detailed integration guide |

## What Changed

### Database Schema

**New Columns Added to `users` table:**
- `platform` (TEXT) - 'facebook' or 'instagram'
- `platform_id` (TEXT) - Facebook UID or Instagram UUID
- `platform_url` (TEXT) - Original profile URL
- `migrated_at` (DATETIME) - When platform_id was populated

**New Indexes:**
```sql
CREATE UNIQUE INDEX idx_users_platform_id
ON users(platform, platform_id) WHERE platform_id IS NOT NULL;
```

**New Views:**
- `v_migration_progress` - Track migration status
- `v_users_needing_migration` - Users without platform_id

### Database Wrapper Updates

**New Methods:**
- `getOrCreateUser(userData)` - Smart user creation with auto-migration
- `updateUserPlatformId(username, platform, platform_id, url)` - Update platform_id
- `getUser(identifier, platform)` - Get user by username or platform_id
- `getMigrationProgress()` - Get migration statistics
- `getUsersNeedingMigration(limit)` - Get users needing migration

**Updated Methods:**
- `saveMedia(usernameOrData, mediaId)` - Now accepts object with platform_id

## Migration Strategies

### Strategy 1: Lazy Migration (Default)

✅ **Recommended for most cases**

**How it works:**
- New API calls automatically include platform_id
- Old users are migrated when they appear in new API responses
- No manual intervention needed

**Timeline:**
- Week 1: Deploy changes
- Week 2-4: 20-40% migrated naturally
- Month 2: 60-80% migrated
- Month 3+: 90%+ migrated

### Strategy 2: Background Migration

**How it works:**
- Run script to fetch platform_id for existing users
- Processes in batches with rate limiting
- Can be paused and resumed

**When to use:**
- Need faster migration
- Want to migrate important users immediately
- Have tolerance for API rate limits

**Commands:**
```bash
# Migrate 50 users
node database/migrate-platform-ids.js --limit 50

# Dry run
node database/migrate-platform-ids.js --dry-run

# With custom client ID
node database/migrate-platform-ids.js --client-id client_abc123 --limit 100
```

### Strategy 3: Hybrid Approach

**Recommended:**
1. Deploy lazy migration (automatic)
2. Run background migration for top 50 users
3. Let rest migrate naturally over time

```bash
# Migrate your top 50 most active users
node database/migrate-platform-ids.js --limit 50

# Check progress
sqlite3 database/social_media.db "SELECT * FROM v_migration_progress"
```

## Monitoring

### Check Migration Progress

**Via Database:**
```javascript
const { getDatabase } = require('./database/db');

const db = getDatabase();
await db.connect();

const progress = await db.getMigrationProgress();
console.log(`Migrated: ${progress.migration_percent}%`);
console.log(`Pending: ${progress.pending_users} users`);

db.close();
```

**Via SQL:**
```bash
sqlite3 database/social_media.db "SELECT * FROM v_migration_progress"
```

**Output:**
```
total_users | migrated_users | pending_users | migration_percent | facebook_users | instagram_users
    287     |       45       |      242      |      15.68        |      120       |      167
```

## API Integration

### Facebook Entity Info API

```javascript
const { fetchFacebookUid } = require('./src/utils/platformIdUtils');

const result = await fetchFacebookUid(
    'https://www.facebook.com/trang.quach.526875',
    'client_id'
);

// Returns: { uid: '100010817016408', name: 'Quach Trang', avatar: '...' }
```

### Instagram User Info API

```javascript
const { fetchInstagramUuid } = require('./src/utils/platformIdUtils');

const result = await fetchInstagramUuid(
    'https://www.instagram.com/chanz_sweet.052',
    'client_id'
);

// Returns: { uid: '17620207550', name: 'Quach Trang', avatar: '...', username: 'chanz_sweet.052' }
```

### Auto-Detect Platform

```javascript
const { autoFetchPlatformId } = require('./src/utils/platformIdUtils');

const result = await autoFetchPlatformId(url, 'client_id');

// Returns: { platform: 'instagram', uid: '17620207550', ... }
```

## Benefits

### Before (Username-based)

❌ Usernames can change
❌ No stable identifier
❌ Hard to track user across platforms
❌ Duplicate users if username changes

### After (platform_id-based)

✅ Stable, permanent identifier
✅ Survives username changes
✅ Unique per platform
✅ Cleaner data architecture

## Backward Compatibility

**100% backward compatible!**

```javascript
// Old code still works
await db.saveMedia('username', 'media_id');
await db.isMediaSaved('username', 'media_id');
await db.getCursor('username', 'api_name');

// New code gets benefits
await db.saveMedia({
    username: 'username',
    platform_id: '123456'
}, 'media_id');
```

## FAQs

### Q: Do I need to update my code?

**A:** No! The system is backward compatible. But you'll get benefits if you pass `platform_id` when available.

### Q: What if some users can't be migrated?

**A:** It's OK! Deleted/private accounts will keep using username. System handles both.

### Q: Will this break existing functionality?

**A:** No. All existing functions work as before. platform_id is an enhancement.

### Q: How long does background migration take?

**A:** With rate limits:
- 50 users: ~2-3 minutes
- 100 users: ~5-10 minutes
- 287 users: ~15-20 minutes

### Q: Can I pause and resume migration?

**A:** Yes! Stop the script anytime. Re-run to continue from where it left off.

### Q: What if a user changes their username?

**A:** With platform_id, you'll still find them! That's the whole point.

## Troubleshooting

### Migration script fails

**Check:**
- Database exists: `ls database/social_media.db`
- Migration not already applied
- No syntax errors in migration SQL

**Solution:**
```bash
# Re-run migration
node database/apply-migration.js
```

### Users not auto-migrating

**Check:**
- Are you passing `platform_id` in user data?
- Is the API response actually returning UID/UUID?

**Debug:**
```javascript
console.log('User data:', userData);  // Check what's being passed
await db.saveMedia(userData, mediaId);
```

### Rate limiting during background migration

**Solution:**
Edit `migrate-platform-ids.js`:
```javascript
const DELAY_BETWEEN_BATCHES = 10000;  // Increase
const DELAY_BETWEEN_REQUESTS = 2000;  // Increase
```

## Examples

See `docs/PLATFORM_ID_INTEGRATION.md` for detailed examples of:
- Updating controllers
- Handling API responses
- Testing migration
- Error handling

## Support

**Issues?** Check:
1. `database/PLATFORM_ID_README.md` (this file)
2. `docs/PLATFORM_ID_INTEGRATION.md` (detailed guide)
3. `database/README.md` (general database guide)

## Summary

🚀 **Deploy:** `node database/apply-migration.js`
📦 **Auto-migrate:** Just pass platform_id in API responses
⚡ **Optional boost:** `node database/migrate-platform-ids.js --limit 50`
📊 **Monitor:** `SELECT * FROM v_migration_progress`

**That's it!** Your app now uses stable platform IDs while maintaining full backward compatibility.
