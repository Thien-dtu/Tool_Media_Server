# Database Design - ERD & Schema

## Entity-Relationship Diagram

```
┌─────────────────────┐
│      api_types      │
│─────────────────────│
│ id (PK)             │
│ name (UNIQUE)       │  e.g., "get_list_fb_user_photos", "get_list_ig_post"
│ created_at          │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)             │
│ username (UNIQUE)   │  e.g., "trang.quach.526875"
│ created_at          │
└─────────────────────┘
          │
          ├─────────────────┬─────────────────┐
          │ 1:N             │ 1:N             │ 1:N
          ▼                 ▼                 ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   user_cursors      │  │   saved_media       │  │   api_reports       │
│─────────────────────│  │─────────────────────│  │─────────────────────│
│ id (PK)             │  │ id (PK)             │  │ id (PK)             │
│ user_id (FK)        │  │ user_id (FK)        │  │ api_type_id (FK)    │
│ api_type_id (FK)    │  │ media_id            │  │ timestamp           │
│ cursor              │  │ created_at          │  │ created_at          │
│ pages_loaded        │  │                     │  └─────────────────────┘
│ last_updated        │  │ UNIQUE(user_id,     │           │
│                     │  │        media_id)    │           │ 1:N
│ UNIQUE(user_id,     │  └─────────────────────┘           ▼
│        api_type_id) │                          ┌─────────────────────┐
└─────────────────────┘                          │  report_details     │
                                                 │─────────────────────│
                                                 │ id (PK)             │
                                                 │ report_id (FK)      │
                                                 │ user_id (FK)        │
                                                 │ url                 │
                                                 │ total_items         │
                                                 │ items_saved         │
                                                 │ items_not_saved     │
                                                 │ duration            │ (in seconds)
                                                 │ pages_fetched       │
                                                 └─────────────────────┘
```

## Schema Design Rationale

### 1. **api_types** Table
- Stores different API types (e.g., "get_list_fb_user_photos", "get_list_ig_post")
- Normalizes the repeated API name strings
- Allows easy addition of new API types

### 2. **users** Table
- Central table for all usernames
- One record per unique username
- Eliminates username duplication across tables

### 3. **user_cursors** Table
- Replaces `last_cursors.json`
- Stores pagination cursors per user per API type
- Composite unique constraint ensures one cursor per user-API combination
- Indexed for fast lookups during pagination

### 4. **saved_media** Table
- Replaces `saved_images.json`
- Stores downloaded media items
- Composite unique constraint prevents duplicate entries
- Fast checks for "already downloaded" status

### 5. **api_reports** Table
- Replaces `ig_user_stories_report.jsonl` (parent records)
- One record per API call session
- Groups multiple user reports by timestamp

### 6. **report_details** Table
- Child records of api_reports
- Individual user results within a report session
- Stores metrics: total, have, nohave, duration, pages

## Benefits of This Design

### Performance
- **Indexed lookups**: Fast queries by username, API type, timestamp
- **Normalized data**: No repeated strings (usernames, API names)
- **Efficient joins**: Proper foreign keys enable fast joins
- **Pagination cursors**: O(1) lookup instead of scanning JSON

### Storage
- **50MB+ file becomes ~5-10MB** database with indexes
- **No file parsing**: Direct SQL queries instead of loading entire JSON
- **Incremental writes**: Append new records without rewriting entire file

### Features
- **Complex queries**:
  - "Show me all users who haven't been downloaded yet"
  - "What's the average download time per API?"
  - "Which users have the most saved media?"
- **Data integrity**: Foreign keys prevent orphaned records
- **Concurrent access**: SQLite handles multiple readers/writers
- **Transactions**: Atomic operations prevent data corruption

## Migration Strategy

1. Read existing JSON/JSONL files
2. Extract unique API types and users
3. Insert into normalized tables
4. Maintain backward compatibility (keep files as backup)
5. Gradually migrate code to use SQLite queries

## Indexes for Performance

```sql
-- Primary keys (automatic indexes)
-- user_cursors: (user_id, api_type_id)
-- saved_media: (user_id, media_id)
-- report_details: (report_id)

-- Additional indexes
CREATE INDEX idx_reports_timestamp ON api_reports(timestamp);
CREATE INDEX idx_reports_api_type ON api_reports(api_type_id);
CREATE INDEX idx_saved_media_created ON saved_media(created_at);
CREATE INDEX idx_report_details_user ON report_details(user_id);
```

## Query Examples

### Check if media is already saved
```sql
SELECT COUNT(*) > 0 as is_saved
FROM saved_media sm
JOIN users u ON sm.user_id = u.id
WHERE u.username = ? AND sm.media_id = ?;
```

### Get cursor for user/API
```sql
SELECT uc.cursor, uc.pages_loaded
FROM user_cursors uc
JOIN users u ON uc.user_id = u.id
JOIN api_types a ON uc.api_type_id = a.id
WHERE u.username = ? AND a.name = ?;
```

### Get report statistics
```sql
SELECT
    u.username,
    SUM(rd.total_items) as total,
    SUM(rd.items_saved) as saved,
    AVG(rd.duration) as avg_duration
FROM report_details rd
JOIN users u ON rd.user_id = u.id
JOIN api_reports ar ON rd.report_id = ar.id
WHERE ar.timestamp >= ?
GROUP BY u.username
ORDER BY total DESC;
```
