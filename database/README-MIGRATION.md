# Database Migration Guide

## Overview

This migration transforms the application from a username-based system to a stable uid/uuid-based system with username change tracking.

**Migration Status:** Ready to execute

## What Changed

### Before (JSON/JSONL Files)
- `data/saved_images.json` - List of saved media (username + media_id)
- `data/last_cursors.json` - Pagination cursors by username
- `data/ig_user_stories_report.jsonl` - API call reports by username

**Problems:**
- ❌ Username changes break tracking
- ❌ Same user appears as different users after username change
- ❌ No stable identifier across platforms

### After (SQLite Database)
- `database/social_media.db` - Normalized relational database
- Users identified by stable Facebook UID / Instagram UUID
- Username history tracked over time
- All relationships use internal user ID

**Benefits:**
- ✅ Survives username changes
- ✅ Stable unique identifier per platform
- ✅ Track username history
- ✅ Better performance with indexes
- ✅ Referential integrity with foreign keys

## Database Schema v2

### Tables

1. **platforms** - Platform reference data (facebook, instagram)
2. **users** - Core user table (platform_id, uid)
3. **username_history** - Track username changes (username, is_current)
4. **api_types** - API endpoint types
5. **saved_media** - Downloaded media tracking
6. **user_cursors** - Pagination state
7. **api_reports** - API call sessions
8. **report_details** - Per-user API results with media IDs (JSON)

### Views

- `v_user_stats` - User statistics (media count, last download)
- `v_recent_reports` - Recent API calls with user info
- `v_api_performance` - API performance metrics
- `v_current_usernames` - Quick username lookup

## Migration Process

### Automated (Recommended)

Run the master migration script:

```bash
node scripts/migrate-all.js
```

This runs all 7 steps automatically:
1. Backup old files
2. Create database schema
3. Extract username mappings from data files
4. Bootstrap users (fetch uid/uuid from APIs) **~15-30 minutes**
5. Migrate saved_images.json → saved_media
6. Migrate last_cursors.json → user_cursors
7. Migrate ig_user_stories_report.jsonl → api_reports + report_details
8. Verify migration integrity

### Manual (Step by Step)

If you prefer to run each step manually:

```bash
# Step 1: Create database
node database/create-database.js

# Step 2: Extract username mappings
node database/extract-username-mapping.js

# Step 3: Bootstrap users (LONG RUNNING - can take 15-30 mins)
node database/bootstrap-users.js

# Step 4: Migrate saved media
node database/migrate-saved-media.js

# Step 5: Migrate cursors
node database/migrate-cursors.js

# Step 6: Migrate reports
node database/migrate-reports.js

# Step 7: Verify migration
node database/verify-migration.js
```

## Resume Capability

If the bootstrap-users script is interrupted:

```bash
# Just run it again - it will resume from where it left off
node database/bootstrap-users.js
```

Progress is saved every 10 users in `database/migration-log.json`.

## Configuration

**API Client ID:** `client_yp2rhpgvv_100005146594548` (configured in bootstrap-users.js)

**Rate Limiting:**
- 1 second delay between API calls
- Processes ~60 users per minute
- ~16-20 minutes for 1000 users

## Verification

After migration, verify the results:

```bash
node database/verify-migration.js
```

Checks:
- Row counts match source files
- Foreign key integrity
- All users have username_history
- All users have valid UID
- Sample queries work correctly

## Expected Results

For ~1000 users:
- **users table:** ~987 rows (some may fail if account deleted/private)
- **username_history:** ~987 rows (1 per user initially)
- **saved_media:** Same count as saved_images.json (minus users without UID)
- **user_cursors:** Same count as last_cursors.json (minus users without UID)
- **api_reports:** Same count as JSONL lines
- **report_details:** Same count as report entries

## Files Created

### New Files
- `database/schema-v2.sql` - New schema
- `database/create-database.js` - Database creation
- `database/extract-username-mapping.js` - Extract usernames
- `database/bootstrap-users.js` - Fetch uid/uuid
- `database/migrate-saved-media.js` - Migrate saved media
- `database/migrate-cursors.js` - Migrate cursors
- `database/migrate-reports.js` - Migrate reports
- `database/verify-migration.js` - Verification
- `database/db-v2.js` - New database wrapper
- `scripts/migrate-all.js` - Master migration script

### Generated Files
- `database/social_media.db` - SQLite database
- `database/username-mapping.json` - Username → platform + URL mapping
- `database/migration-log.json` - Bootstrap progress log

### Backup Files
- `database/db.js.old` - Old database wrapper
- `database/schema.sql.old` - Old schema
- `database/migrate.js.old` - Old migration script

## Sample Queries

### Get user by username
```sql
SELECT * FROM v_current_usernames
WHERE username = 'chanz_sweet.052';
```

### Get media count for user in date range
```sql
SELECT
    u.uid,
    uh.username,
    COUNT(DISTINCT sm.media_id) as media_count
FROM saved_media sm
JOIN users u ON sm.user_id = u.id
LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
WHERE u.uid = '17620207550'
  AND sm.created_at BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY u.uid, uh.username;
```

### Get unique post count by API and date range (like Report page)
```sql
WITH report_media AS (
  SELECT
    u.uid,
    uh.username,
    rd.media_ids
  FROM api_reports ar
  JOIN api_types at ON ar.api_type_id = at.id
  JOIN report_details rd ON ar.id = rd.report_id
  JOIN users u ON rd.user_id = u.id
  LEFT JOIN username_history uh ON u.id = uh.user_id AND uh.is_current = 1
  WHERE at.name = 'get_list_ig_user_stories'
    AND ar.timestamp BETWEEN '2025-01-01' AND '2025-01-31'
)
SELECT
  uid,
  username,
  COUNT(DISTINCT json_each.value) as unique_posts
FROM report_media,
  json_each(report_media.media_ids)
GROUP BY uid, username
ORDER BY unique_posts DESC;
```

## Troubleshooting

### Issue: Some users failed to bootstrap

**Cause:** Deleted accounts, private accounts, or API errors

**Solution:** This is expected. Users without UID will be skipped in data migration. Check `migration-log.json` for details.

### Issue: Row count mismatch

**Cause:** Users without UID can't be migrated

**Solution:** This is normal. Verification script shows expected differences.

### Issue: Foreign key violations

**Cause:** Data integrity issue

**Solution:** Run verification script to identify and fix issues.

### Issue: Bootstrap script too slow

**Cause:** Rate limiting delays

**Solution:** Adjust `DELAY_BETWEEN_REQUESTS` in bootstrap-users.js (increase if hitting rate limits, decrease to go faster).

## Next Steps

After successful migration:

1. ✅ Review verification results
2. ✅ Test sample queries
3. ✅ Update application to use `database/db-v2.js`
4. ✅ Update controllers to pass uid/uuid when available
5. ✅ Commit changes to Git
6. ✅ Optional: Delete old JSON files (or keep as backup)

## Rollback

If migration fails and you need to rollback:

```bash
# Restore old files
mv database/db.js.old database/db.js
mv database/schema.sql.old database/schema.sql
mv database/migrate.js.old database/migrate.js

# Delete new database
rm database/social_media.db

# Original data files are untouched
```

## Support

For issues or questions:
- Check verification script output
- Review migration-log.json
- Check this README

## License

Internal project documentation
