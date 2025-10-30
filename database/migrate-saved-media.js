/**
 * Migrate saved_images.json to saved_media table
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'social_media.db');
const SAVED_IMAGES_PATH = path.join(__dirname, '..', 'data', 'saved_images.json');

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

async function migrateSavedMedia() {
    console.log('🚀 Migrating saved_images.json → saved_media table\n');

    if (!fs.existsSync(SAVED_IMAGES_PATH)) {
        console.log('⚠️  saved_images.json not found, skipping\n');
        return;
    }

    const data = JSON.parse(fs.readFileSync(SAVED_IMAGES_PATH, 'utf8'));
    console.log(`📊 Found ${data.length} media items\n`);

    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
    });

    await runAsync(db, 'PRAGMA foreign_keys = ON');

    const stats = {
        total: data.length,
        inserted: 0,
        skipped: 0,
        failed: 0
    };

    try {
        for (let i = 0; i < data.length; i++) {
            const { username, id: mediaId } = data[i];

            // Progress
            if ((i + 1) % 100 === 0) {
                process.stdout.write(`\r🔄 Processing: ${i + 1}/${data.length}`);
            }

            // Find user by username
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

            // Insert media
            try {
                await runAsync(db,
                    'INSERT OR IGNORE INTO saved_media (user_id, media_id) VALUES (?, ?)',
                    [user.id, mediaId]
                );
                stats.inserted++;
            } catch (err) {
                stats.failed++;
            }
        }

        console.log('\n'); // New line after progress

        console.log('═'.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   Total items: ${stats.total}`);
        console.log(`   Inserted: ${stats.inserted}`);
        console.log(`   Skipped (user not found): ${stats.skipped}`);
        if (stats.failed > 0) {
            console.log(`   Failed: ${stats.failed}`);
        }
        console.log('═'.repeat(60));
        console.log('\n✅ saved_media migration completed!\n');

    } catch (err) {
        console.error('\n❌ Migration error:', err.message);
        throw err;
    } finally {
        db.close();
    }
}

if (require.main === module) {
    migrateSavedMedia().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { migrateSavedMedia };
