/**
 * Migration Script: JSON/JSONL to SQLite
 *
 * This script migrates data from flat files to a normalized SQLite database:
 * - data/saved_images.json → saved_media table
 * - data/last_cursors.json → user_cursors table
 * - data/ig_user_stories_report.jsonl → api_reports + report_details tables
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// File paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(__dirname, 'social_media.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const SAVED_IMAGES_PATH = path.join(DATA_DIR, 'saved_images.json');
const LAST_CURSORS_PATH = path.join(DATA_DIR, 'last_cursors.json');
const REPORT_PATH = path.join(DATA_DIR, 'ig_user_stories_report.jsonl');

// Helper: Promisify SQLite operations
function runAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Helper: Parse duration string "HH:MM:SS" to seconds
function parseDuration(durationStr) {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

// Helper: Get or create user ID
async function getOrCreateUser(db, username) {
    let user = await getAsync(db, 'SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
        const result = await runAsync(db, 'INSERT INTO users (username) VALUES (?)', [username]);
        return result.lastID;
    }
    return user.id;
}

// Helper: Get or create API type ID
async function getOrCreateApiType(db, apiName) {
    let apiType = await getAsync(db, 'SELECT id FROM api_types WHERE name = ?', [apiName]);
    if (!apiType) {
        const result = await runAsync(db, 'INSERT INTO api_types (name) VALUES (?)', [apiName]);
        return result.lastID;
    }
    return apiType.id;
}

// Migration: saved_images.json → saved_media table
async function migrateSavedImages(db) {
    console.log('\n📦 Migrating saved_images.json...');

    if (!fs.existsSync(SAVED_IMAGES_PATH)) {
        console.log('   ⚠️  File not found, skipping.');
        return;
    }

    const data = JSON.parse(fs.readFileSync(SAVED_IMAGES_PATH, 'utf8'));
    console.log(`   Found ${data.length} saved media items`);

    let inserted = 0;
    let skipped = 0;

    for (const item of data) {
        try {
            const userId = await getOrCreateUser(db, item.username);
            await runAsync(db,
                'INSERT OR IGNORE INTO saved_media (user_id, media_id) VALUES (?, ?)',
                [userId, item.id]
            );
            inserted++;
        } catch (err) {
            console.error(`   ❌ Error inserting ${item.username}/${item.id}:`, err.message);
            skipped++;
        }
    }

    console.log(`   ✅ Inserted: ${inserted}, Skipped: ${skipped}`);
}

// Migration: last_cursors.json → user_cursors table
async function migrateLastCursors(db) {
    console.log('\n🔖 Migrating last_cursors.json...');

    if (!fs.existsSync(LAST_CURSORS_PATH)) {
        console.log('   ⚠️  File not found, skipping.');
        return;
    }

    const data = JSON.parse(fs.readFileSync(LAST_CURSORS_PATH, 'utf8'));
    let inserted = 0;

    for (const [apiName, users] of Object.entries(data)) {
        const apiTypeId = await getOrCreateApiType(db, apiName);

        for (const [username, cursorData] of Object.entries(users)) {
            try {
                const userId = await getOrCreateUser(db, username);
                await runAsync(db,
                    'INSERT OR REPLACE INTO user_cursors (user_id, api_type_id, cursor, pages_loaded) VALUES (?, ?, ?, ?)',
                    [userId, apiTypeId, cursorData.cursor, cursorData.pagesLoaded]
                );
                inserted++;
            } catch (err) {
                console.error(`   ❌ Error inserting cursor for ${username}:`, err.message);
            }
        }
    }

    console.log(`   ✅ Inserted: ${inserted} cursors`);
}

// Migration: ig_user_stories_report.jsonl → api_reports + report_details tables
async function migrateReports(db) {
    console.log('\n📊 Migrating ig_user_stories_report.jsonl...');

    if (!fs.existsSync(REPORT_PATH)) {
        console.log('   ⚠️  File not found, skipping.');
        return;
    }

    const content = fs.readFileSync(REPORT_PATH, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    console.log(`   Found ${lines.length} report entries`);

    let inserted = 0;
    let skipped = 0;

    for (const line of lines) {
        try {
            const reportData = JSON.parse(line);
            const apiTypeId = await getOrCreateApiType(db, reportData.apiName);

            // Insert report
            const reportResult = await runAsync(db,
                'INSERT INTO api_reports (api_type_id, timestamp) VALUES (?, ?)',
                [apiTypeId, reportData.timestamp]
            );
            const reportId = reportResult.lastID;

            // Insert report details
            for (const detail of reportData.report) {
                const userId = await getOrCreateUser(db, detail.username);
                await runAsync(db,
                    `INSERT INTO report_details
                    (report_id, user_id, url, total_items, items_saved, items_not_saved, duration, pages_fetched)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        reportId,
                        userId,
                        detail.url,
                        detail.total,
                        detail.have,
                        detail.nohave,
                        parseDuration(detail.time),
                        detail.pages
                    ]
                );
            }

            inserted++;
        } catch (err) {
            console.error(`   ❌ Error inserting report:`, err.message);
            skipped++;
        }
    }

    console.log(`   ✅ Inserted: ${inserted} reports, Skipped: ${skipped}`);
}

// Main migration function
async function migrate() {
    console.log('🚀 Starting migration from JSON/JSONL to SQLite...\n');

    // Create or open database
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
    });

    try {
        // Enable foreign keys
        await runAsync(db, 'PRAGMA foreign_keys = ON');

        // Read and execute schema
        console.log('📝 Creating database schema...');
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        const statements = schema.split(';').filter(s => s.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await runAsync(db, statement);
            }
        }
        console.log('   ✅ Schema created');

        // Run migrations in order
        await migrateSavedImages(db);
        await migrateLastCursors(db);
        await migrateReports(db);

        // Show statistics
        console.log('\n📈 Database Statistics:');
        const stats = {
            users: await getAsync(db, 'SELECT COUNT(*) as count FROM users'),
            apiTypes: await getAsync(db, 'SELECT COUNT(*) as count FROM api_types'),
            savedMedia: await getAsync(db, 'SELECT COUNT(*) as count FROM saved_media'),
            cursors: await getAsync(db, 'SELECT COUNT(*) as count FROM user_cursors'),
            reports: await getAsync(db, 'SELECT COUNT(*) as count FROM api_reports'),
            reportDetails: await getAsync(db, 'SELECT COUNT(*) as count FROM report_details')
        };

        console.log(`   Users: ${stats.users.count}`);
        console.log(`   API Types: ${stats.apiTypes.count}`);
        console.log(`   Saved Media: ${stats.savedMedia.count}`);
        console.log(`   User Cursors: ${stats.cursors.count}`);
        console.log(`   API Reports: ${stats.reports.count}`);
        console.log(`   Report Details: ${stats.reportDetails.count}`);

        console.log('\n✅ Migration completed successfully!');
        console.log(`📁 Database created at: ${DB_PATH}`);

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    migrate().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { migrate };
