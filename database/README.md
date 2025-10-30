# Database Migration Guide

This directory contains the SQLite database schema, migration scripts, and database utilities.

## Overview

The database replaces three JSON files with a normalized relational database:
- `data/saved_images.json` → `saved_media` table
- `data/last_cursors.json` → `user_cursors` table
- `data/ig_user_stories_report.jsonl` → `api_reports` + `report_details` tables

## Files

- `schema.sql` - Complete database schema with tables, indexes, views, and triggers
- `migrate.js` - Migration script to convert JSON/JSONL files to SQLite
- `db.js` - Database wrapper module with convenient methods
- `README.md` - This file

## Getting Started

### 1. Install Dependencies

```bash
npm install sqlite3
```

### 2. Run Migration

```bash
node database/migrate.js
```

This will:
- Create `database/social_media.db`
- Read all JSON/JSONL files from `data/`
- Import data into normalized tables
- Display statistics

**Output example:**
```
🚀 Starting migration from JSON/JSONL to SQLite...

📝 Creating database schema...
   ✅ Schema created

📦 Migrating saved_images.json...
   Found 15380 saved media items
   ✅ Inserted: 15380, Skipped: 0

🔖 Migrating last_cursors.json...
   ✅ Inserted: 156 cursors

📊 Migrating ig_user_stories_report.jsonl...
   Found 4563 report entries
   ✅ Inserted: 4563 reports, Skipped: 0

📈 Database Statistics:
   Users: 287
   API Types: 5
   Saved Media: 15380
   User Cursors: 156
   API Reports: 4563
   Report Details: 5821

✅ Migration completed successfully!
📁 Database created at: D:\test_bak\database\social_media.db
```

### 3. Use in Your Application

```javascript
const { getDatabase } = require('./database/db');

async function example() {
    const db = getDatabase();
    await db.connect();

    // Check if media is saved
    const isSaved = await db.isMediaSaved('username', 'media_id');

    // Save media
    await db.saveMedia('username', 'media_id');

    // Get cursor
    const cursor = await db.getCursor('username', 'get_list_fb_user_photos');

    // Save cursor
    await db.saveCursor('username', 'get_list_fb_user_photos', 'cursor_string', 5);

    db.close();
}
```

## API Reference

### Database Connection

```javascript
const { getDatabase } = require('./database/db');

const db = getDatabase();
await db.connect();  // Connect to database
db.close();          // Close connection
```

### Saved Media Operations

#### Check if media is saved
```javascript
const isSaved = await db.isMediaSaved(username, mediaId);
// Returns: boolean
```

#### Check multiple media IDs
```javascript
const savedIds = await db.getMultipleSavedMedia(username, ['id1', 'id2', 'id3']);
// Returns: ['id1', 'id3']  (IDs that are saved)
```

#### Save media
```javascript
await db.saveMedia(username, mediaId);
```

#### Batch save media
```javascript
const items = [
    { username: 'user1', mediaId: 'id1' },
    { username: 'user2', mediaId: 'id2' }
];
const count = await db.batchSaveMedia(items);
// Returns: number of items saved
```

#### Get saved media by user
```javascript
const media = await db.getSavedMediaByUser(username);
// Returns: [{ media_id: '...', created_at: '...' }, ...]
```

### Cursor Operations

#### Get cursor
```javascript
const cursor = await db.getCursor(username, apiName);
// Returns: { cursor: '...', pagesLoaded: 5 } or null
```

#### Get cursors for multiple users
```javascript
const cursors = await db.getMultipleCursors(apiName, ['user1', 'user2']);
// Returns: {
//   'user1': { cursor: '...', pagesLoaded: 5 },
//   'user2': { cursor: '...', pagesLoaded: 3 }
// }
```

#### Save cursor
```javascript
await db.saveCursor(username, apiName, cursorString, pagesLoaded);
```

### Report Operations

#### Save report
```javascript
const reportDetails = [
    {
        username: 'user1',
        url: 'https://...',
        total: 100,
        have: 50,
        nohave: 50,
        time: '00:01:30',
        pages: 5
    }
];

const reportId = await db.saveReport(apiName, reportDetails, timestamp);
```

#### Get recent reports
```javascript
const reports = await db.getRecentReports(10);
// Returns last 10 reports
```

#### Get reports by date range
```javascript
const reports = await db.getReportsByDateRange('2025-01-01', '2025-12-31');
```

### Statistics

#### Get user statistics
```javascript
const stats = await db.getUserStats();
// Returns: [
//   {
//     username: 'user1',
//     total_saved_media: 1234,
//     last_download_date: '2025-10-30',
//     active_api_types: 3
//   },
//   ...
// ]
```

#### Get API performance metrics
```javascript
const metrics = await db.getApiPerformance();
// Returns: [
//   {
//     api_name: 'get_list_fb_user_photos',
//     total_calls: 100,
//     unique_users: 50,
//     total_items_fetched: 10000,
//     total_items_saved: 5000,
//     avg_duration_seconds: 45.3,
//     avg_pages_per_call: 12.5
//   },
//   ...
// ]
```

## Integrating with Existing Code

### Example: Replace fileUtils.js functions

**Before (JSON):**
```javascript
const { readSavedList, writeSavedList } = require('./utils/fileUtils');

// Check if saved
const savedList = readSavedList();
const isSaved = savedList.some(e => e.username === username && e.id === mediaId);

// Save
savedList.push({ username, id: mediaId });
writeSavedList(savedList);
```

**After (SQLite):**
```javascript
const { getDatabase } = require('../database/db');

// Check if saved
const db = getDatabase();
const isSaved = await db.isMediaSaved(username, mediaId);

// Save
await db.saveMedia(username, mediaId);
```

### Example: Replace cursor operations

**Before (JSON):**
```javascript
const { readLastCursors, writeLastCursors } = require('./utils/fileUtils');

// Get cursor
const allCursors = readLastCursors();
const cursor = allCursors[apiName]?.[username] || null;

// Save cursor
if (!allCursors[apiName]) allCursors[apiName] = {};
allCursors[apiName][username] = { cursor, pagesLoaded };
writeLastCursors(allCursors);
```

**After (SQLite):**
```javascript
const { getDatabase } = require('../database/db');

// Get cursor
const db = getDatabase();
const cursorData = await db.getCursor(username, apiName);

// Save cursor
await db.saveCursor(username, apiName, cursor, pagesLoaded);
```

## Performance Benefits

### Storage
- **Before**: 53+ MB JSONL file
- **After**: ~5-10 MB SQLite database (with indexes)
- **Reduction**: 80-90% smaller

### Speed
- **File operations**: O(n) scan of entire file
- **Database queries**: O(log n) indexed lookups
- **Batch operations**: 10-100x faster with transactions

### Example Benchmarks

| Operation | JSON Files | SQLite | Improvement |
|-----------|-----------|--------|-------------|
| Check if saved | 10-50ms | <1ms | 10-50x faster |
| Get cursor | 5-20ms | <1ms | 5-20x faster |
| Save 100 items | 500-2000ms | 50-100ms | 10-20x faster |
| Complex query | Not possible | 1-5ms | ∞ |

## Database Schema

See `DATABASE_DESIGN.md` for complete ERD and schema details.

### Key Tables

- **users** - All unique usernames
- **api_types** - API endpoint types (e.g., "get_list_fb_user_photos")
- **saved_media** - Downloaded media items
- **user_cursors** - Pagination cursors per user per API
- **api_reports** - API call session records
- **report_details** - Individual user results within a report

### Views

- **v_user_stats** - Aggregated user statistics
- **v_recent_reports** - Recent reports with details
- **v_api_performance** - API performance metrics

## Backward Compatibility

The migration script does NOT delete the original JSON files. They remain as backups.

To maintain backward compatibility during transition:
1. Run migration to create database
2. Update code module by module
3. Use database for new operations
4. Keep JSON files as fallback
5. Once fully migrated, optionally archive JSON files

## Maintenance

### Backup Database
```bash
# Copy database file
cp database/social_media.db database/social_media.backup.db

# Or use SQLite backup command
sqlite3 database/social_media.db ".backup database/social_media.backup.db"
```

### Vacuum Database (optimize)
```bash
sqlite3 database/social_media.db "VACUUM;"
```

### View Database Info
```bash
sqlite3 database/social_media.db ".tables"
sqlite3 database/social_media.db ".schema users"
```

## Troubleshooting

### Database locked error
- Close all connections before writing
- Use `db.close()` after operations
- Consider using a connection pool for concurrent access

### Migration fails
- Check file paths are correct
- Ensure write permissions
- Verify JSON files are valid
- Check console for specific errors

### Performance issues
- Run `VACUUM` to optimize
- Check indexes are created
- Use transactions for bulk operations
- Close unused connections

## Next Steps

1. ✅ Run migration: `node database/migrate.js`
2. ✅ Verify data: Check statistics output
3. ✅ Update code: Replace JSON operations with database calls
4. ✅ Test thoroughly: Ensure no regressions
5. ✅ Monitor: Check query performance
6. ✅ Archive: Backup JSON files once stable

For questions or issues, see `docs/DATABASE_DESIGN.md` for detailed schema information.
