/**
 * Migrate last_cursors.json to user_cursors table
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'social_media.db');
const LAST_CURSORS_PATH = path.join(__dirname, '..', 'data', 'last_cursors.json');

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

async function migrateCursors() {
    console.log('🚀 Migrating last_cursors.json → user_cursors table\n');

    if (!fs.existsSync(LAST_CURSORS_PATH)) {
        console.log('⚠️  last_cursors.json not found, skipping\n');
        return;
    }

    const data = JSON.parse(fs.readFileSync(LAST_CURSORS_PATH, 'utf8'));

    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
    });

    await runAsync(db, 'PRAGMA foreign_keys = ON');

    const stats = {
        total: 0,
        inserted: 0,
        skipped: 0
    };

    try {
        // Process each API type
        for (const [apiName, users] of Object.entries(data)) {
            console.log(`📊 Processing API: ${apiName}`);

            // Get or create API type
            let apiType = await getAsync(db,
                'SELECT id FROM api_types WHERE name = ?',
                [apiName]
            );

            if (!apiType) {
                const result = await runAsync(db,
                    'INSERT INTO api_types (name) VALUES (?)',
                    [apiName]
                );
                apiType = { id: result.lastID };
            }

            // Process each user
            for (const [username, cursorData] of Object.entries(users)) {
                stats.total++;

                // Find user
                const user = await getAsync(db,
                    `SELECT u.id
                     FROM users u
                     JOIN username_history uh ON u.id = uh.user_id
                     WHERE uh.username = ? AND uh.is_current = 1`,
                    [username]
                );

                if (!user) {
                    stats.skipped++;
                    continue;
                }

                // Insert cursor
                await runAsync(db,
                    `INSERT OR REPLACE INTO user_cursors
                     (user_id, api_type_id, cursor, pages_loaded)
                     VALUES (?, ?, ?, ?)`,
                    [user.id, apiType.id, cursorData.cursor, cursorData.pagesLoaded]
                );

                stats.inserted++;
            }

            console.log(`   ✅ ${Object.keys(users).length} cursors processed\n`);
        }

        console.log('═'.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   Total cursors: ${stats.total}`);
        console.log(`   Inserted: ${stats.inserted}`);
        console.log(`   Skipped (user not found): ${stats.skipped}`);
        console.log('═'.repeat(60));
        console.log('\n✅ user_cursors migration completed!\n');

    } catch (err) {
        console.error('\n❌ Migration error:', err.message);
        throw err;
    } finally {
        db.close();
    }
}

if (require.main === module) {
    migrateCursors().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { migrateCursors };
