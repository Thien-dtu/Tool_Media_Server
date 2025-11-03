/**
 * Master Migration Script
 * Runs complete migration from JSON/JSONL to SQLite with uid/uuid
 */

const fs = require('fs');
const path = require('path');

// Import migration modules
const { createDatabase } = require('../database/create-database');
const { extractUsernameMapping } = require('../database/extract-username-mapping');
const { bootstrapUsers } = require('../database/bootstrap-users');
const { migrateSavedMedia } = require('../database/migrate-saved-media');
const { migrateCursors } = require('../database/migrate-cursors');
const { migrateReports } = require('../database/migrate-reports');
const { verifyMigration } = require('../database/verify-migration');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateAll() {
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('   🚀 SOCIAL MEDIA DATABASE MIGRATION');
    console.log('   From JSON/JSONL → SQLite with UID/UUID');
    console.log('═'.repeat(70));
    console.log('\n');

    const startTime = Date.now();

    try {
        // Backup old database files
        console.log('[Step 0/7] Backing up old files...\n');
        const dbOldFiles = ['db.js', 'schema.sql', 'migrate.js'];
        for (const file of dbOldFiles) {
            const oldPath = path.join(__dirname, '..', 'database', file);
            if (fs.existsSync(oldPath)) {
                const backupPath = path.join(__dirname, '..', 'database', `${file}.old`);
                fs.copyFileSync(oldPath, backupPath);
                console.log(`   ✅ Backed up: ${file} → ${file}.old`);
            }
        }
        console.log();

        // Step 1: Create database
        console.log('[Step 1/7] Creating database schema...\n');
        await createDatabase();
        await sleep(1000);

        // Step 2: Extract username mappings
        console.log('[Step 2/7] Extracting username mappings...\n');
        await extractUsernameMapping();
        await sleep(1000);

        // Step 3: Bootstrap users (LONG RUNNING - ~20 minutes)
        console.log('[Step 3/7] Bootstrapping users (fetching uid/uuid)...\n');
        console.log('⚠️  This step may take 15-30 minutes for 1000+ users');
        console.log('   The script is resumable - you can stop and restart if needed\n');
        await bootstrapUsers();
        await sleep(1000);

        // Step 4: Migrate saved_media
        console.log('[Step 4/7] Migrating saved_images.json...\n');
        await migrateSavedMedia();
        await sleep(1000);

        // Step 5: Migrate cursors
        console.log('[Step 5/7] Migrating last_cursors.json...\n');
        await migrateCursors();
        await sleep(1000);

        // Step 6: Migrate reports
        console.log('[Step 6/7] Migrating ig_user_stories_report.jsonl...\n');
        await migrateReports();
        await sleep(1000);

        // Step 7: Verify
        console.log('[Step 7/7] Verifying migration...\n');
        await verifyMigration();

        // Summary
        const duration = Math.round((Date.now() - startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        console.log('\n');
        console.log('═'.repeat(70));
        console.log('   ✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('═'.repeat(70));
        console.log(`   Total time: ${minutes}m ${seconds}s`);
        console.log(`   Database: database/social_media.db`);
        console.log(`   Mapping: database/username-mapping.json`);
        console.log(`   Log: database/migration-log.json`);
        console.log('═'.repeat(70));
        console.log('\n');

        console.log('📝 Next Steps:');
        console.log('   1. Review verification results above');
        console.log('   2. Test database queries: node database/db-v3.js');
        console.log('   3. Update application to use new database wrapper');
        console.log('   4. Commit changes to git\n');

    } catch (err) {
        console.error('\n');
        console.error('═'.repeat(70));
        console.error('   ❌ MIGRATION FAILED');
        console.error('═'.repeat(70));
        console.error('\nError:', err.message);
        console.error('\nStack trace:', err.stack);
        console.error('\n⚠️  Check migration-log.json for progress');
        console.error('   You can resume by running this script again\n');
        process.exit(1);
    }
}

// Run migration
if (require.main === module) {
    migrateAll().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { migrateAll };
