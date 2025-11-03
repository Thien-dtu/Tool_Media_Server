# GEMINI.md

## Project Overview

This project consists of a set of Node.js scripts designed to manage and migrate a SQLite database for social media data. The primary purpose of these scripts is to evolve the data storage from a simple, username-based flat-file system (JSON and JSONL) to a more robust and resilient relational database using SQLite. The system is designed to handle user data, saved media, API cursors, and reports, with a key feature being the ability to track users even if they change their usernames.

## Key Technologies

*   **Backend:** Node.js
*   **Database:** SQLite

## Project Evolution

The project has undergone several key migrations, each enhancing the data model and capabilities:

1.  **Initial Migration (V1):**
    *   **Script:** `migrate.js`
    *   **Schema:** `schema.sql` (inferred)
    *   **Purpose:** This was the first migration from JSON/JSONL files to a SQLite database. It established the initial relational structure but relied on usernames as the primary user identifier.

2.  **V2 Migration (UID/UUID-based):**
    *   **Scripts:** `create-database.js`, `bootstrap-users.js`, etc.
    *   **Schema:** `schema-v2.sql`
    *   **Database Wrapper:** `db-v2.js`
    *   **Purpose:** This major overhaul introduced a `uid`/`uuid`-based user system to solve the problem of username changes. It added tables like `platforms` and `username_history` to track user identity more reliably.

3.  **Platform ID Migration (V3):**
    *   **Script:** `apply-migration.js`
    *   **Schema:** `migrations/001_add_platform_ids.sql`
    *   **Database Wrapper:** `db-v3.js`
    *   **Purpose:** This is the latest enhancement, adding explicit `platform` and `platform_id` columns to the `users` table. This allows for a more robust system to identify users across different social media platforms (e.g., Facebook and Instagram). It also includes views to monitor the migration progress.

## Database Schema

The current database schema (V3) is designed to be resilient to username changes and to provide a clear structure for social media data. Key tables include:

*   `users`: Stores user information, with `platform` and `platform_id` as the primary identifiers.
*   `username_history`: Tracks changes to usernames over time.
*   `saved_media`: Stores information about saved media items.
*   `user_cursors`: Manages pagination cursors for API calls.
*   `api_reports` and `report_details`: Log information about API calls and their results.
*   `platforms`: A reference table for social media platforms.

The schema also includes several views (`v_migration_progress`, `v_user_stats`, etc.) to provide aggregated data and statistics.

## Core Scripts

*   `migrate.js`: The original migration script for moving from JSON to SQLite.
*   `create-database.js`: Creates a fresh database using the v2 schema.
*   `apply-migration.js`: Applies the platform ID migration (V3) to an existing database.
*   `migrate-platform-ids.js`: A background worker script to fetch and populate missing platform IDs for existing users.
*   `db-v3.js`: The most current database wrapper, providing an API for interacting with the SQLite database. It includes functions for creating, reading, and updating data.
*   `verify-migration.js`: A script to check the integrity of the data after a migration.

## Building and Running

There is no build step for this project. The scripts are run directly using Node.js.

### Running Migrations

**Initial Migration (V1):**
```bash
node database/migrate.js
```

**Platform ID Migration (V3):**
To apply the latest migration to an existing database:
```bash
node database/apply-migration.js
```

**Migrating Existing Users:**
To fetch and populate platform IDs for existing users:
```bash
# Migrate top 50 users
node database/migrate-platform-ids.js --limit 50

# See what would be migrated (dry run)
node database/migrate-platform-ids.js --dry-run
```

### Using the Database

The `db-v3.js` module provides a `getDatabase` function to get a singleton instance of the database wrapper.

```javascript
const { getDatabase } = require('./database/db-v3');

async function example() {
    const db = getDatabase();
    await db.connect();

    // Your database operations here

    db.close();
}
```
