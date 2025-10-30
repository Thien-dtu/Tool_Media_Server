/**
 * Background Platform ID Migration Worker
 * Fetches missing UIDs/UUIDs for existing users
 */

const { getDatabase } = require('./db');
const {
    detectPlatform,
    extractUsernameFromUrl,
    fetchPlatformId
} = require('../src/utils/platformIdUtils');

// Configuration
const BATCH_SIZE = 10;  // Process 10 users at a time
const DELAY_BETWEEN_BATCHES = 5000;  // 5 seconds between batches
const DELAY_BETWEEN_REQUESTS = 1000;  // 1 second between individual requests
const CLIENT_ID = process.env.CLIENT_ID || 'client_default';

// Helper: Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build profile URL from username and platform
 * @param {string} username - Username
 * @param {string} platform - 'facebook' or 'instagram'
 * @returns {string} - Profile URL
 */
function buildProfileUrl(username, platform) {
    if (platform === 'facebook') {
        return `https://www.facebook.com/${username}`;
    } else if (platform === 'instagram') {
        return `https://www.instagram.com/${username}`;
    }
    return null;
}

/**
 * Attempt to migrate a single user
 * @param {Object} db - Database instance
 * @param {Object} user - User object
 * @param {string} clientId - WebSocket client ID
 * @returns {Promise<boolean>} - True if successful
 */
async function migrateUser(db, user, clientId) {
    const { id, username, platform } = user;

    console.log(`   🔄 Processing: ${username} (${platform || 'unknown'})`);

    // Skip if platform is unknown
    if (!platform) {
        console.log(`      ⚠️  Skipped: Unknown platform`);
        return false;
    }

    // Build URL
    const url = buildProfileUrl(username, platform);
    if (!url) {
        console.log(`      ❌ Failed: Could not build URL`);
        return false;
    }

    try {
        // Fetch platform ID
        const result = await fetchPlatformId(platform, url, clientId);

        if (!result || !result.uid) {
            console.log(`      ❌ Failed: No UID/UUID returned`);
            return false;
        }

        // Update database
        await db.updateUserPlatformId(username, platform, result.uid, url);
        console.log(`      ✅ Migrated: ${platform}:${result.uid}`);

        return true;
    } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
        return false;
    }
}

/**
 * Main migration function
 * @param {Object} options - Migration options
 * @param {number} options.limit - Maximum users to migrate
 * @param {string} options.clientId - WebSocket client ID
 * @param {boolean} options.dryRun - If true, don't actually update database
 */
async function migratePlatformIds(options = {}) {
    const {
        limit = 100,
        clientId = CLIENT_ID,
        dryRun = false
    } = options;

    console.log('🚀 Starting Platform ID Migration\n');
    console.log(`   Batch Size: ${BATCH_SIZE}`);
    console.log(`   Max Users: ${limit}`);
    console.log(`   Dry Run: ${dryRun ? 'Yes' : 'No'}`);
    console.log(`   Client ID: ${clientId}\n`);

    const db = getDatabase();
    await db.connect();

    try {
        // Get migration status
        const progress = await db.getMigrationProgress();
        console.log('📊 Current Status:');
        console.log(`   Total Users: ${progress.total_users}`);
        console.log(`   Migrated: ${progress.migrated_users} (${progress.migration_percent}%)`);
        console.log(`   Pending: ${progress.pending_users}\n`);

        if (progress.pending_users === 0) {
            console.log('✅ All users already migrated!');
            return;
        }

        // Get users needing migration
        const usersToMigrate = await db.getUsersNeedingMigration(limit);
        console.log(`📝 Found ${usersToMigrate.length} users to migrate\n`);

        if (usersToMigrate.length === 0) {
            console.log('✅ No users need migration');
            return;
        }

        // Process in batches
        let totalProcessed = 0;
        let totalSucceeded = 0;
        let totalFailed = 0;

        for (let i = 0; i < usersToMigrate.length; i += BATCH_SIZE) {
            const batch = usersToMigrate.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(usersToMigrate.length / BATCH_SIZE);

            console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} users):`);

            for (const user of batch) {
                if (dryRun) {
                    console.log(`   [DRY RUN] Would migrate: ${user.username} (${user.platform})`);
                    totalProcessed++;
                } else {
                    const success = await migrateUser(db, user, clientId);
                    totalProcessed++;

                    if (success) {
                        totalSucceeded++;
                    } else {
                        totalFailed++;
                    }

                    // Wait between requests to avoid rate limiting
                    await sleep(DELAY_BETWEEN_REQUESTS);
                }
            }

            // Wait between batches
            if (i + BATCH_SIZE < usersToMigrate.length) {
                console.log(`\n   ⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
                await sleep(DELAY_BETWEEN_BATCHES);
            }
        }

        // Show final statistics
        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   Processed: ${totalProcessed}`);
        console.log(`   Succeeded: ${totalSucceeded}`);
        console.log(`   Failed: ${totalFailed}`);

        if (!dryRun && totalSucceeded > 0) {
            const newProgress = await db.getMigrationProgress();
            console.log(`\n   New Migration Rate: ${newProgress.migration_percent}%`);
            console.log(`   Remaining: ${newProgress.pending_users} users`);
        }

        console.log('='.repeat(60) + '\n');

        if (totalFailed > 0) {
            console.log('⚠️  Some users failed to migrate. This could be due to:');
            console.log('   - Deleted or private accounts');
            console.log('   - Rate limiting');
            console.log('   - Network errors');
            console.log('   - Invalid usernames');
            console.log('\n💡 You can run this script again later to retry failed users.\n');
        }

        if (!dryRun && totalSucceeded > 0) {
            console.log('✅ Migration completed successfully!\n');
        }

    } catch (err) {
        console.error('\n❌ Migration error:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        db.close();
    }
}

// CLI support
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--limit' && args[i + 1]) {
            options.limit = parseInt(args[i + 1], 10);
            i++;
        } else if (arg === '--client-id' && args[i + 1]) {
            options.clientId = args[i + 1];
            i++;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Platform ID Migration Tool

Usage: node database/migrate-platform-ids.js [options]

Options:
  --limit <number>       Maximum users to migrate (default: 100)
  --client-id <string>   WebSocket client ID (default: from env or 'client_default')
  --dry-run              Show what would be migrated without making changes
  --help, -h             Show this help message

Examples:
  node database/migrate-platform-ids.js
  node database/migrate-platform-ids.js --limit 50
  node database/migrate-platform-ids.js --dry-run
  node database/migrate-platform-ids.js --client-id client_abc123 --limit 20
            `);
            process.exit(0);
        }
    }

    migratePlatformIds(options).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { migratePlatformIds };
