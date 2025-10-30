/**
 * Bootstrap Users - Fetch uid/uuid for all users
 * Calls get_ig_user_info and get_fb_entity_info APIs
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const DB_PATH = path.join(__dirname, 'social_media.db');
const MAPPING_PATH = path.join(__dirname, 'username-mapping.json');
const LOG_PATH = path.join(__dirname, 'migration-log.json');

const CLIENT_ID = 'client_yp2rhpgvv_100005146594548';
const API_BASE_URL = 'http://localhost:3000';
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second

// Promisify SQLite operations
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call API to fetch user info
 */
async function fetchUserInfo(platform, url) {
    const apiName = platform === 'facebook' ? 'get_fb_entity_info' : 'get_ig_user_info';
    const apiParams = platform === 'facebook'
        ? { url, raw: '' }
        : { url, raw: false };

    try {
        const response = await axios.post(`${API_BASE_URL}/call`, {
            id: CLIENT_ID,
            apiname: apiName,
            apiparams: apiParams
        }, {
            timeout: 30000
        });

        const data = response.data;

        if (data.result && data.result.uid) {
            return {
                uid: data.result.uid,
                username: data.result.username,
                name: data.result.name,
                avatar: data.result.avatar
            };
        }

        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Insert user into database
 */
async function insertUser(db, platform, uid, username, profileUrl) {
    const platformId = platform === 'facebook' ? 1 : 2;

    // Check if user already exists
    const existing = await getAsync(db,
        'SELECT id FROM users WHERE platform_id = ? AND uid = ?',
        [platformId, uid]
    );

    if (existing) {
        return existing.id;
    }

    // Insert user
    const result = await runAsync(db,
        'INSERT INTO users (platform_id, uid) VALUES (?, ?)',
        [platformId, uid]
    );

    const userId = result.lastID;

    // Insert username_history
    await runAsync(db,
        'INSERT INTO username_history (user_id, username, profile_url, is_current) VALUES (?, ?, ?, 1)',
        [userId, username, profileUrl]
    );

    return userId;
}

/**
 * Load migration log (for resume capability)
 */
function loadMigrationLog() {
    if (fs.existsSync(LOG_PATH)) {
        return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    }
    return {
        processedUsernames: [],
        successCount: 0,
        failCount: 0,
        lastProcessedIndex: -1
    };
}

/**
 * Save migration log
 */
function saveMigrationLog(log) {
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

async function bootstrapUsers() {
    console.log('🚀 Starting user bootstrap (fetching uid/uuid)\n');

    // Load username mapping
    if (!fs.existsSync(MAPPING_PATH)) {
        console.error('❌ Username mapping file not found!');
        console.error('   Please run: node database/extract-username-mapping.js');
        process.exit(1);
    }

    const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
    const entries = Object.entries(mapping);

    console.log(`📊 Total users to process: ${entries.length}\n`);

    // Load migration log (for resume)
    const log = loadMigrationLog();
    const startIndex = log.lastProcessedIndex + 1;

    if (startIndex > 0) {
        console.log(`🔄 Resuming from user ${startIndex + 1}/${entries.length}\n`);
    }

    // Connect to database
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
    });

    await runAsync(db, 'PRAGMA foreign_keys = ON');

    const stats = {
        processed: log.successCount + log.failCount,
        success: log.successCount,
        failed: log.failCount,
        skipped: 0
    };

    const startTime = Date.now();

    try {
        // Process users
        for (let i = startIndex; i < entries.length; i++) {
            const [username, { platform, url }] = entries[i];

            // Progress indicator
            const progress = Math.round(((i + 1) / entries.length) * 100);
            process.stdout.write(`\r🔄 Processing: ${i + 1}/${entries.length} (${progress}%) - ${username}`);

            // Check if already processed (in case of re-run)
            if (log.processedUsernames.includes(username)) {
                stats.skipped++;
                continue;
            }

            // Fetch user info from API
            const userInfo = await fetchUserInfo(platform, url);

            if (userInfo && userInfo.uid) {
                // Insert into database
                try {
                    await insertUser(db, platform, userInfo.uid, userInfo.username || username, url);
                    stats.success++;
                } catch (err) {
                    console.error(`\n   ❌ Database error for ${username}:`, err.message);
                    stats.failed++;
                }
            } else {
                // Failed to fetch UID - skip user
                stats.failed++;
            }

            stats.processed++;

            // Update log
            log.processedUsernames.push(username);
            log.successCount = stats.success;
            log.failCount = stats.failed;
            log.lastProcessedIndex = i;

            // Save progress every 10 users
            if ((i + 1) % 10 === 0) {
                saveMigrationLog(log);
            }

            // Rate limiting
            await sleep(DELAY_BETWEEN_REQUESTS);
        }

        console.log('\n'); // New line after progress

        // Save final log
        saveMigrationLog(log);

        const duration = Math.round((Date.now() - startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        console.log('═'.repeat(60));
        console.log('📊 Bootstrap Summary:');
        console.log(`   Total users: ${entries.length}`);
        console.log(`   Successfully migrated: ${stats.success}`);
        console.log(`   Failed (no UID): ${stats.failed}`);
        if (stats.skipped > 0) {
            console.log(`   Skipped (already processed): ${stats.skipped}`);
        }
        console.log(`   Duration: ${minutes}m ${seconds}s`);
        console.log('═'.repeat(60));

        if (stats.failed > 0) {
            console.log('\n⚠️  Some users could not be migrated:');
            console.log('   - Deleted or private accounts');
            console.log('   - API errors or rate limiting');
            console.log('   - These users will be skipped in data migration');
        }

        console.log('\n✅ User bootstrap completed!\n');

    } catch (err) {
        console.error('\n❌ Fatal error:', err.message);
        console.error(err.stack);
        saveMigrationLog(log);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run if executed directly
if (require.main === module) {
    bootstrapUsers().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { bootstrapUsers };
