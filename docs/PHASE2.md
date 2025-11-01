# Phase 2: Database Integration Implementation Guide

## Overview

Phase 2 builds upon the Phase 1 database migration by integrating the SQLite database throughout the application stack. This phase implements smart UID caching, auto-fetch capabilities, and provides comprehensive database query APIs with frontend visualization.

## Implementation Summary

### Timeline
- **Start Date**: Continuation from Phase 1 (November 2025)
- **Status**: Core Implementation Complete
- **Completion**: 17/23 tasks completed (74%)

### Key Achievements
- ✅ Backend database integration with auto-fetch UID
- ✅ Smart caching with database-first approach
- ✅ 11 new database query API endpoints
- ✅ 3 new React components for data visualization
- ✅ Frontend integration with Home and Batch pages
- ⏳ Test coverage pending (controllers, endpoints, E2E)

## Architecture

### Smart Caching Strategy

```
User Request → Check Database (Fast Path) → Return if found with UID
                       ↓
                Not found or no UID
                       ↓
            Fetch from API (Slow Path) → Save to Database → Return
```

**Benefits:**
- Instant lookups for known users (database query ~1ms)
- One-time API cost per new user
- Automatic UID population for existing users
- Graceful degradation on database errors

### Parallel Write Pattern (Transition Period)

During the transition from file-based to database storage:
- **Write to Database** (new system)
- **Write to Files** (old system for backup)
- **Fallback to File-Only** on database errors

This ensures:
- Zero data loss during transition
- Backward compatibility with existing tools
- Safe rollback capability if needed

## Backend Implementation

### 1. Core Utilities

**File:** `src/utils/userFetching.js`

**Functions:**
```javascript
async function getOrFetchUser(urlOrUsername, platform, clientId)
async function bulkFetchUsers(urls, clientId, concurrency = 3)
async function userHasUid(username)
async function getUserByUid(platform, uid)
function buildProfileUrl(username, platform)
```

**Test Coverage:** 94.68% statements, 87.67% branches, 100% functions

### 2. Controller Integration

**Modified Files:**
- `src/controllers/downloadController.js`
- `src/controllers/cursorController.js`
- `src/controllers/reportController.js`

**Pattern Implementation:**
```javascript
const db = getDatabase();
let dbWasConnected = db.db !== null;
try {
    if (!dbWasConnected) await db.connect();

    // Database operations...
    await db.saveMedia(username, mediaId);

    // File operations (parallel write)...
    await writeSavedList(updatedList);

    if (!dbWasConnected) db.close();
} catch (err) {
    console.warn('Database error, falling back to file-only:', err.message);
    if (!dbWasConnected && db.db) db.close();
    // Continue with file-only operations
}
```

**Key Features:**
- Check if database already connected before connecting
- Only close connections we opened
- Graceful error handling with fallback
- Parallel writes during transition

### 3. API Routes

**File:** `src/routes/reports.js` (4 endpoints)

```javascript
GET  /api/db/reports/recent?limit=10
GET  /api/db/reports/date-range?startDate=X&endDate=Y
GET  /api/db/reports/stats
POST /api/db/reports/query
```

**File:** `src/routes/users.js` (7 endpoints)

```javascript
GET  /api/db/users/stats
GET  /api/db/users/:username
GET  /api/db/users/:platform/:uid
POST /api/db/users/fetch
POST /api/db/users/bulk-fetch
GET  /api/db/users/:username/media?limit=50
POST /api/db/users/search
```

**Mounted in:** `src/app.js` under `/api/db` prefix

## Frontend Implementation

### 1. API Client

**File:** `react-client/src/lib/dbApiClient.js`

Provides clean JavaScript API for all 11 database endpoints:
- Error handling with meaningful messages
- URL encoding for parameters
- JSON serialization/deserialization
- HTTP status code handling

**Example Usage:**
```javascript
import { getRecentReports, getUserStats, fetchUser } from './lib/dbApiClient'

// Fetch recent reports
const { reports } = await getRecentReports(20)

// Get user statistics
const { users } = await getUserStats()

// Fetch user with UID auto-fetch
const { user, cached } = await fetchUser({
    url: 'https://instagram.com/username',
    clientId: 'your-client-id'
})
```

### 2. React Components

**Directory:** `react-client/src/components/database/`

#### UserReportTable.jsx
Enhanced report table with:
- Sortable columns (username, API, counts, pages, time, timestamp)
- Username filter with live search
- Completion progress bars
- Color-coded completion percentages
- Aggregate statistics footer
- Click-to-sort headers

**Props:**
```javascript
<UserReportTable
    reports={reportsArray}
    onDeleteReport={handleDelete}  // optional
/>
```

#### MediaGroupedByUser.jsx
User media grouped display with:
- Expandable user sections
- Sort by media count, username, or last download
- User statistics (media count, last download time)
- UID and platform badges
- Profile URL links
- Responsive card layout

**Props:**
```javascript
<MediaGroupedByUser
    users={usersArray}
    onRefresh={handleRefresh}
/>
```

#### UserInfoSection.jsx
User management interface with:
- Search for users by username
- Fetch UID from API for new users
- Bulk UID fetching (up to 50 URLs)
- Progress tracking for bulk operations
- Success/error feedback
- Detailed results display

**Props:**
```javascript
<UserInfoSection
    clientId={clientId}
    onUserUpdated={handleUpdate}
/>
```

### 3. Page Integration

**Modified Files:**
- `react-client/src/pages/Home.jsx`
- `react-client/src/pages/Batch.jsx`

**Features Added:**
- Database section with toggle show/hide
- Refresh button for database data
- Auto-load database data on mount
- Integrated UserInfoSection for UID management
- UserReportTable for viewing reports
- MediaGroupedByUser for user statistics

**UI Layout:**
```
┌─────────────────────────────────────────┐
│  Existing Page Content                   │
│  (API calls, downloads, results)         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  📊 Database Reports & Users             │
│  [🔄 Refresh] [▶ Show / ▼ Hide]         │
├─────────────────────────────────────────┤
│  User Info Section                       │
│  - Search users                          │
│  - Fetch UIDs                            │
│  - Bulk operations                       │
├─────────────────────────────────────────┤
│  Reports Table                           │
│  - Sortable columns                      │
│  - Filter by username                    │
│  - Completion progress                   │
├─────────────────────────────────────────┤
│  Media Grouped by User                   │
│  - Expandable user cards                 │
│  - Sort options                          │
│  - User statistics                       │
└─────────────────────────────────────────┘
```

## Database Schema Usage

### Tables Used

1. **users** - User information with UID
   - Queries: getUserByUsername, getUserByUid, getOrCreateUser
   - Updates: updateUsername

2. **username_history** - Username changes tracking
   - Queries: username with is_current = 1
   - Updates: mark previous usernames as not current

3. **platforms** - Platform reference
   - Queries: platform lookup by name
   - No updates (reference data)

4. **saved_media** - Downloaded media tracking
   - Queries: isMediaSaved, getSavedMediaByUser
   - Inserts: saveMedia

5. **user_cursors** - Pagination cursor tracking
   - Queries: getCursor
   - Inserts/Updates: saveCursor

6. **api_reports** - API call reports
   - Queries: getRecentReports, getReportsByDateRange
   - Inserts: saveReport

## API Endpoints Reference

See [API-ENDPOINTS.md](./API-ENDPOINTS.md) for detailed API documentation.

## Testing Strategy

### Unit Tests
- **userFetching.js**: 23 tests, 94.68% coverage ✅
- **Controllers**: Pending ⏳
- **API Routes**: Pending ⏳
- **React Components**: Pending ⏳

### Integration Tests
- Controller + Database: Pending ⏳
- API Endpoints E2E: Pending ⏳

### E2E Tests
- Home page with database section: Pending ⏳
- Batch page with database section: Pending ⏳

See [TESTING.md](./TESTING.md) for detailed testing guide.

## Configuration

### Environment Variables

```env
# Database (from Phase 1)
DATABASE_URL=./database/media-downloader.db

# API Client ID
VITE_CLIENT_ID=your-client-id

# API Base URL
VITE_API_BASE=http://localhost:3000
```

### Frontend Build

```bash
cd react-client
npm install
npm run dev     # Development
npm run build   # Production
npm run lint    # Linting
```

### Backend

```bash
npm install
npm start                    # Production
npm run dev                  # Development with nodemon
npm run test:unit           # Unit tests
npm run test:coverage       # Coverage report
```

## Migration Path

### For Existing Users

1. **Database Migration** (Phase 1 - Completed)
   ```bash
   node scripts/migrate-all.js
   ```
   - Migrates JSON/JSONL files to SQLite
   - Preserves all existing data
   - Generates migration report

2. **Parallel Operation** (Phase 2 - Current)
   - Backend writes to both database and files
   - No action required from users
   - Data automatically synced

3. **File Deprecation** (Future Phase)
   - Once database is proven stable
   - File writes can be removed
   - Migration complete

### For New Users

1. Start with database-only mode
2. No file migration needed
3. All operations use database

## Performance Characteristics

### Database Operations
- User lookup with UID: ~1ms
- Media saved check: ~2ms
- Report query (20 items): ~5ms
- Bulk user fetch (10 users): ~100-500ms (API-dependent)

### API Endpoints
- GET endpoints: 5-50ms
- POST endpoints: 10-100ms
- Bulk operations: 1-5s (depends on API latency)

### Frontend
- Component render: <16ms (60fps)
- Database data fetch: 10-100ms
- Bulk UID fetch: 1-10s (depends on count)

## Error Handling

### Backend Errors

1. **Database Connection Failure**
   - Falls back to file-only mode
   - Logs warning to console
   - Continues operation without database

2. **API Fetch Errors**
   - Returns user without UID
   - Saves partial data to database
   - User can retry fetch later

3. **File Operation Errors**
   - Tries database save first
   - If both fail, returns error to user
   - Logs detailed error message

### Frontend Errors

1. **API Request Failure**
   - Shows error message to user
   - Provides retry option
   - Maintains UI state

2. **Database Fetch Failure**
   - Displays empty state
   - Provides refresh button
   - Logs error to console

## Monitoring

### Key Metrics to Track

1. **Database Performance**
   - Query execution time
   - Connection pool usage
   - Database file size

2. **UID Fetch Rate**
   - Cache hit rate (should be >80%)
   - API calls per user
   - Failed fetches

3. **Data Consistency**
   - Database vs file discrepancies
   - Missing UIDs for active users
   - Username change tracking

### Logs to Monitor

```javascript
// Success logs
'✅ Database connected for download tracking'
'💾 Saved to database: {id} for {username}'
'🔑 User {username} → UID: {uid}'

// Warning logs
'⚠️ Database connection failed, falling back to file-only mode'
'⚠️ Could not fetch UID for {username}, continuing without UID'

// Info logs
'📚 Retrieved cursor from database for {username}'
'📄 Retrieved cursor from file for {username}'
```

## Rollback Procedure

If issues arise with Phase 2:

1. **Quick Rollback** (keeps Phase 1 database)
   ```bash
   git revert HEAD~2  # Revert Phase 2 commits
   npm install
   cd react-client && npm install
   npm start
   ```

2. **Full Rollback** (back to pre-Phase 1)
   ```bash
   git checkout <commit-before-phase-1>
   npm install
   cd react-client && npm install
   npm start
   ```

3. **Data is Safe**
   - All file writes continue during Phase 2
   - Database is additional, not replacement
   - No data loss possible

## Future Enhancements

### Phase 3 (Planned)
- Remove file write redundancy
- Database-only operations
- Performance optimization
- Indexed queries

### Phase 4 (Possible)
- Multi-user support
- User authentication
- Cloud database option
- Real-time updates via WebSocket

## Troubleshooting

### Database Not Updating

**Symptom:** New downloads not showing in database section

**Solutions:**
1. Check database file permissions
2. Check database file path in DATABASE_URL
3. Check console for error messages
4. Try manual refresh button

### UID Not Fetching

**Symptom:** Users show "Chưa có UID" (No UID)

**Solutions:**
1. Verify CLIENT_ID is set correctly
2. Check API availability
3. Try manual fetch in User Info Section
4. Check network connection

### Frontend Not Loading Database Data

**Symptom:** Database section shows empty

**Solutions:**
1. Check backend is running
2. Check VITE_API_BASE is correct
3. Check browser console for errors
4. Check network tab in DevTools

## Contributing

When contributing to Phase 2:

1. Follow existing code patterns
2. Add tests for new functionality
3. Update documentation
4. Use the dbWasConnected pattern for database connections
5. Provide fallback for all database operations
6. Test both database and file-only modes

## References

- [Phase 1 Migration Guide](./MIGRATION.md)
- [API Endpoints Documentation](./API-ENDPOINTS.md)
- [Testing Guide](./TESTING.md)
- [Database Schema](./DATABASE-SCHEMA.md)

---

**Last Updated:** November 2025
**Status:** Core Implementation Complete, Tests Pending
**Next Steps:** Write remaining tests, complete documentation, deploy to production
