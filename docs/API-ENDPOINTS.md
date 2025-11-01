# API Endpoints Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the application, with a focus on the new database query endpoints introduced in Phase 2.

## Base URL

```
http://localhost:3000
```

Configure via environment variable: `VITE_API_BASE`

## Authentication

Currently, the API uses a client ID system:
- Client ID is passed in request body as `clientId`
- No authentication tokens required
- Rate limiting may be implemented in future phases

---

## Database Query Endpoints

All database endpoints are prefixed with `/api/db`

### Reports Endpoints

#### GET /api/db/reports/recent

Get recent API call reports from the database.

**Query Parameters:**
- `limit` (integer, optional): Number of reports to return. Default: 10, Max: 100

**Response:**
```json
{
  "reports": [
    {
      "apiName": "get_list_ig_post",
      "report": [
        {
          "username": "testuser",
          "url": "https://instagram.com/testuser",
          "total": 50,
          "have": 30,
          "nohave": 20,
          "ids": ["id1", "id2", ...],
          "time": "00:01:23",
          "pages": 5
        }
      ],
      "timestamp": "2025-11-01T10:00:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/db/reports/recent?limit=20
```

---

#### GET /api/db/reports/date-range

Get reports within a specific date range.

**Query Parameters:**
- `startDate` (string, required): ISO 8601 date string (e.g., "2025-10-01T00:00:00Z")
- `endDate` (string, required): ISO 8601 date string

**Response:**
```json
{
  "reports": [...]
}
```

**Example:**
```bash
curl "http://localhost:3000/api/db/reports/date-range?startDate=2025-10-01T00:00:00Z&endDate=2025-11-01T23:59:59Z"
```

---

#### GET /api/db/reports/stats

Get aggregated report statistics.

**Query Parameters:** None

**Response:**
```json
{
  "stats": {
    "totalReports": 150,
    "totalMediaFetched": 5000,
    "totalMediaSaved": 3500,
    "averageCompletionRate": 70.0,
    "apiBreakdown": {
      "get_list_ig_post": 80,
      "get_list_fb_user_photos": 70
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/db/reports/stats
```

---

#### POST /api/db/reports/query

Query reports with custom filters.

**Request Body:**
```json
{
  "apiName": "get_list_ig_post",      // optional
  "username": "testuser",              // optional
  "startDate": "2025-10-01T00:00:00Z", // optional
  "endDate": "2025-11-01T23:59:59Z",   // optional
  "limit": 50                          // optional, default: 50
}
```

**Response:**
```json
{
  "reports": [...]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/db/reports/query \
  -H "Content-Type: application/json" \
  -d '{
    "apiName": "get_list_ig_post",
    "startDate": "2025-10-01T00:00:00Z",
    "limit": 20
  }'
```

---

### User Endpoints

#### GET /api/db/users/stats

Get user statistics including media counts and last download times.

**Query Parameters:** None

**Response:**
```json
{
  "users": [
    {
      "username": "testuser",
      "uid": "12345678",
      "platform_name": "instagram",
      "profile_url": "https://instagram.com/testuser",
      "media_count": 150,
      "last_download": "2025-11-01T10:00:00.000Z",
      "created_at": "2025-10-01T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Example:**
```bash
curl http://localhost:3000/api/db/users/stats
```

---

#### GET /api/db/users/:username

Get user information by username.

**URL Parameters:**
- `username` (string, required): Username to look up

**Response:**
```json
{
  "user": {
    "id": 1,
    "uid": "12345678",
    "username": "testuser",
    "platform_name": "instagram",
    "platform_id": 2,
    "profile_url": "https://instagram.com/testuser",
    "created_at": "2025-10-01T10:00:00.000Z",
    "updated_at": "2025-11-01T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "User not found"
}
```

**Example:**
```bash
curl http://localhost:3000/api/db/users/testuser
```

---

#### GET /api/db/users/:platform/:uid

Get user by platform and UID.

**URL Parameters:**
- `platform` (string, required): Platform name ("facebook" or "instagram")
- `uid` (string, required): User's platform UID

**Response:**
```json
{
  "user": {
    "id": 1,
    "uid": "12345678",
    "username": "testuser",
    "platform_name": "instagram",
    ...
  }
}
```

**Error Response (400):**
```json
{
  "error": "Invalid platform. Must be facebook or instagram"
}
```

**Example:**
```bash
curl http://localhost:3000/api/db/users/instagram/12345678
```

---

#### POST /api/db/users/fetch

Auto-fetch user with UID from API. This is the smart caching endpoint.

**Request Body:**
```json
{
  "url": "https://instagram.com/testuser",
  "platform": "instagram",  // optional, auto-detected from URL
  "clientId": "your-client-id"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "uid": "12345678",
    "username": "testuser",
    "platform_name": "instagram",
    ...
  },
  "cached": false  // true if from database, false if fetched from API
}
```

**Workflow:**
1. Check database for user
2. If found with UID, return immediately (fast path)
3. If not found or no UID, fetch from API (slow path)
4. Save to database for future lookups
5. Return user data

**Example:**
```bash
curl -X POST http://localhost:3000/api/db/users/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://instagram.com/testuser",
    "clientId": "test_client_123"
  }'
```

---

#### POST /api/db/users/bulk-fetch

Bulk fetch multiple users with concurrency control.

**Request Body:**
```json
{
  "urls": [
    "https://instagram.com/user1",
    "https://instagram.com/user2",
    "https://facebook.com/user3"
  ],
  "clientId": "your-client-id",
  "concurrency": 3  // optional, default: 3
}
```

**Response:**
```json
{
  "results": [
    {
      "url": "https://instagram.com/user1",
      "user": { ... },
      "error": null
    },
    {
      "url": "https://instagram.com/user2",
      "user": null,
      "error": "Failed to fetch user"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/db/users/bulk-fetch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://instagram.com/user1", "https://instagram.com/user2"],
    "clientId": "test_client_123",
    "concurrency": 5
  }'
```

---

#### GET /api/db/users/:username/media

Get saved media for a specific user.

**URL Parameters:**
- `username` (string, required): Username

**Query Parameters:**
- `limit` (integer, optional): Number of media items to return. Default: 50

**Response:**
```json
{
  "media": [
    {
      "media_id": "post_id_1",
      "saved_at": "2025-11-01T10:00:00.000Z"
    },
    {
      "media_id": "post_id_2",
      "saved_at": "2025-11-01T10:05:00.000Z"
    }
  ],
  "count": 2,
  "total": 150  // total media for user
}
```

**Example:**
```bash
curl http://localhost:3000/api/db/users/testuser/media?limit=100
```

---

#### POST /api/db/users/search

Search users by username pattern using SQL LIKE.

**Request Body:**
```json
{
  "pattern": "test",
  "limit": 50  // optional, default: 50
}
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "uid": "12345678",
      "username": "testuser",
      "platform_name": "instagram",
      "profile_url": "https://instagram.com/testuser"
    },
    {
      "id": 2,
      "uid": "87654321",
      "username": "anothertest",
      "platform_name": "facebook",
      "profile_url": "https://facebook.com/anothertest"
    }
  ],
  "count": 2
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/db/users/search \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "test",
    "limit": 20
  }'
```

---

## Legacy Endpoints

These endpoints existed before Phase 2 and continue to work.

### POST /call

Call external API with specified parameters.

**Request Body:**
```json
{
  "id": "client-id",
  "apiname": "get_list_ig_post",
  "apiparams": {
    "url": "https://instagram.com/username",
    "cursor": ""
  }
}
```

**Response:**
```json
{
  "result": [...],
  "error": null
}
```

---

### GET /saved-list

Get list of all saved media from files.

**Response:**
```json
{
  "list": [
    {
      "username": "testuser",
      "id": "post_id_1"
    }
  ]
}
```

---

### POST /save-shuffled-urls

Save shuffled URL order for traceability.

**Request Body:**
```json
{
  "apiName": "get_list_ig_post",
  "urls": ["url1", "url2", "url3"],
  "timestamp": "2025-11-01T10:00:00.000Z"
}
```

---

### POST /get-last-cursors

Get saved pagination cursors for users.

**Request Body:**
```json
{
  "apiName": "get_list_ig_post",
  "usernames": ["user1", "user2"]
}
```

**Response:**
```json
{
  "lastCursors": {
    "user1": {
      "cursor": "cursor_string",
      "pagesLoaded": 5
    },
    "user2": {
      "cursor": "",
      "pagesLoaded": 0
    }
  }
}
```

---

### POST /save-last-cursor

Save pagination cursor for a user.

**Request Body:**
```json
{
  "apiName": "get_list_ig_post",
  "username": "testuser",
  "cursor": "cursor_string",
  "pagesLoaded": 5
}
```

---

### POST /save-ig-user-stories-report

Save API call report.

**Request Body:**
```json
{
  "apiName": "get_list_ig_user_stories",
  "report": [
    {
      "username": "testuser",
      "total": 50,
      "have": 30,
      "nohave": 20,
      "ids": ["id1", "id2"],
      "time": "00:01:23",
      "pages": 5
    }
  ],
  "timestamp": "2025-11-01T10:00:00.000Z"
}
```

---

### POST /download

Download media items.

**Request Body:**
```json
{
  "results": [
    {
      "id": "post_id_1",
      "username": "testuser",
      "image": "https://...",
      "video": null,
      "caption": "Test caption",
      "taken_at_timestamp": 1698825600,
      "like_count": 100,
      "comment_count": 10
    }
  ],
  "apiName": "get_list_ig_post",
  "clientId": "your-client-id"
}
```

**Response:**
```json
{
  "message": "Downloaded 1 files."
}
```

---

### POST /check-saved

Check which media IDs are already saved for a user.

**Request Body:**
```json
{
  "username": "testuser",
  "ids": ["id1", "id2", "id3"]
}
```

**Response:**
```json
{
  "saved": ["id1", "id3"]  // IDs that are already saved
}
```

---

## Error Responses

All endpoints use standard HTTP status codes:

- **200 OK**: Request succeeded
- **400 Bad Request**: Invalid request parameters
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

**Error Response Format:**
```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Rate Limiting

Currently no rate limiting is implemented. Future phases may add:
- Per-client rate limits
- Per-endpoint rate limits
- Burst protection

## Pagination

Endpoints that return lists support pagination via `limit` parameter:
- Default limit varies by endpoint (usually 50)
- Maximum limit: 100
- No offset-based pagination yet (planned for future)

## Caching

### Client-Side Caching
Recommended cache headers for GET endpoints:
```
Cache-Control: public, max-age=60
```

### Server-Side Caching
Database queries are cached at the database level (SQLite page cache).

## Frontend Integration

### Using dbApiClient.js

```javascript
import {
  getRecentReports,
  getUserStats,
  fetchUser,
  bulkFetchUsers,
  searchUsers
} from '../lib/dbApiClient'

// Get recent reports
const { reports } = await getRecentReports(20)

// Get user stats
const { users } = await getUserStats()

// Fetch single user with UID auto-fetch
const { user, cached } = await fetchUser({
  url: 'https://instagram.com/username',
  clientId: 'your-client-id'
})

// Bulk fetch users
const { results, summary } = await bulkFetchUsers({
  urls: ['https://instagram.com/user1', 'https://instagram.com/user2'],
  clientId: 'your-client-id',
  concurrency: 3
})

// Search users
const { users, count } = await searchUsers({
  pattern: 'test',
  limit: 20
})
```

## Testing Endpoints

### Using curl

```bash
# Get recent reports
curl http://localhost:3000/api/db/reports/recent?limit=10

# Get user stats
curl http://localhost:3000/api/db/users/stats

# Fetch user
curl -X POST http://localhost:3000/api/db/users/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://instagram.com/testuser", "clientId": "test_123"}'

# Search users
curl -X POST http://localhost:3000/api/db/users/search \
  -H "Content-Type: application/json" \
  -d '{"pattern": "test", "limit": 20}'
```

### Using Postman

1. Import the collection (if available)
2. Set base URL: `http://localhost:3000`
3. Set clientId in environment variables
4. Run requests

### Using Frontend

The React components automatically use these endpoints via `dbApiClient.js`.

---

**Last Updated:** November 2025
**API Version:** 2.0
**Status:** Stable (database endpoints), Legacy (file-based endpoints)
