/**
 * Apply Database Migration
 * Adds platform_id support to existing database
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'social_media.db');
const MIGRATION_PATH = path.join(__dirname, 'migrations', '001_add_platform_ids.sql');

// Promisify SQLite operations
function runAsync(db, sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, function(err) {
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

async function applyMigration() {
    console.log('🔄 Applying database migration: Add platform_id support\n');

    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Database not found at:', DB_PATH);
        console.log('💡 Please run "node database/migrate.js" first to create the database');
        process.exit(1);
    }

    // Open database
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
    });

    try {
        // Enable foreign keys
        await runAsync(db, 'PRAGMA foreign_keys = ON');

        // Check if migration already applied
        const tableInfo = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(users)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const hasPlatformId = tableInfo.some(col => col.name === 'platform_id');

        if (hasPlatformId) {
            console.log('⚠️  Migration already applied - platform_id column exists');

            // Show current migration status
            const status = await getAsync(db, 'SELECT * FROM v_migration_progress');
            if (status) {
                console.log('\n📊 Current Migration Status:');
                console.log(`   Total Users: ${status.total_users}`);
                console.log(`   Migrated: ${status.migrated_users} (${status.migration_percent}%)`);
                console.log(`   Pending: ${status.pending_users}`);
                console.log(`   Facebook: ${status.facebook_users}`);
                console.log(`   Instagram: ${status.instagram_users}`);
                console.log(`   Unknown Platform: ${status.unknown_platform_users}`);
            }

            db.close();
            return;
        }

        // Read migration SQL
        console.log('📝 Reading migration file...');
        const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

        // Split into individual statements
        const statements = migrationSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        console.log(`   Found ${statements.length} SQL statements\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement) continue;

            try {
                await runAsync(db, statement);
                console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
            } catch (err) {
                console.error(`❌ Error executing statement ${i + 1}:`, err.message);
                console.error('Statement:', statement.substring(0, 100) + '...');
                throw err;
            }
        }

        // Infer platform from existing data (best effort)
        console.log('\n🔍 Inferring platform from existing data...');

        // Try to infer from URLs if available
        const usersWithUrls = await new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT u.id, u.username, sm.media_id
                FROM users u
                LEFT JOIN saved_media sm ON u.id = sm.user_id
                LIMIT 1
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Set platform based on common patterns
        // Facebook usernames often have dots, numbers, underscores
        // Instagram usernames are typically shorter, alphanumeric
        await runAsync(db, `
            UPDATE users
            SET platform = 'facebook'
            WHERE platform IS NULL
            AND (
                username LIKE '%.%'
                OR username LIKE '%-%'
                OR LENGTH(username) > 20
            )
        `);

        await runAsync(db, `
            UPDATE users
            SET platform = 'instagram'
            WHERE platform IS NULL
            AND LENGTH(username) <= 30
            AND username NOT LIKE '%.%'
        `);

        const platformsSet = await getAsync(db, `
            SELECT COUNT(*) as count FROM users WHERE platform IS NOT NULL
        `);

        console.log(`   Set platform for ${platformsSet.count} users (based on username patterns)`);
        console.log('   ℹ️  Platform will be confirmed when platform_id is fetched\n');

        // Show final statistics
        const stats = await getAsync(db, 'SELECT * FROM v_migration_progress');
        console.log('📊 Migration Complete!');
        console.log(`   Total Users: ${stats.total_users}`);
        console.log(`   Migrated (with platform_id): ${stats.migrated_users}`);
        console.log(`   Pending Migration: ${stats.pending_users}`);
        console.log(`   Facebook Users: ${stats.facebook_users}`);
        console.log(`   Instagram Users: ${stats.instagram_users}`);
        console.log(`   Unknown Platform: ${stats.unknown_platform_users}`);

        console.log('\n✅ Migration applied successfully!');
        console.log('\n📖 Next Steps:');
        console.log('   1. Run: node database/migrate-platform-ids.js (to fetch missing UIDs/UUIDs)');
        console.log('   2. Application will auto-migrate users as they appear in new API calls');
        console.log('   3. Monitor progress: SELECT * FROM v_migration_progress');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migration
if (require.main === module) {
    applyMigration().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { applyMigration };
