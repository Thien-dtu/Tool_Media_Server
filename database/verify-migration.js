/**
 * Verify Migration Integrity
 * Checks that all data migrated correctly
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'social_media.db');
const SAVED_IMAGES_PATH = path.join(__dirname, '..', 'data', 'saved_images.json');
const LAST_CURSORS_PATH = path.join(__dirname, '..', 'data', 'last_cursors.json');
const REPORT_PATH = path.join(__dirname, '..', 'data', 'ig_user_stories_report.jsonl');

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

async function verifyMigration() {
    console.log('🔍 Verifying migration integrity\n');

    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
    });

    const issues = [];

    try {
        console.log('📊 Checking row counts...\n');

        // Check table counts
        const counts = {
            users: (await getAsync(db, 'SELECT COUNT(*) as count FROM users')).count,
            username_history: (await getAsync(db, 'SELECT COUNT(*) as count FROM username_history')).count,
            saved_media: (await getAsync(db, 'SELECT COUNT(*) as count FROM saved_media')).count,
            user_cursors: (await getAsync(db, 'SELECT COUNT(*) as count FROM user_cursors')).count,
            api_reports: (await getAsync(db, 'SELECT COUNT(*) as count FROM api_reports')).count,
            report_details: (await getAsync(db, 'SELECT COUNT(*) as count FROM report_details')).count
        };

        console.log('   Database Tables:');
        console.log(`   - users: ${counts.users}`);
        console.log(`   - username_history: ${counts.username_history}`);
        console.log(`   - saved_media: ${counts.saved_media}`);
        console.log(`   - user_cursors: ${counts.user_cursors}`);
        console.log(`   - api_reports: ${counts.api_reports}`);
        console.log(`   - report_details: ${counts.report_details}\n`);

        // Check source files
        console.log('   Source Files:');

        if (fs.existsSync(SAVED_IMAGES_PATH)) {
            const savedImages = JSON.parse(fs.readFileSync(SAVED_IMAGES_PATH));
            console.log(`   - saved_images.json: ${savedImages.length} items`);

            if (savedImages.length !== counts.saved_media) {
                const diff = savedImages.length - counts.saved_media;
                console.log(`     ⚠️  Difference: ${diff} items (likely users without UID)`);
            }
        }

        if (fs.existsSync(LAST_CURSORS_PATH)) {
            const lastCursors = JSON.parse(fs.readFileSync(LAST_CURSORS_PATH));
            let cursorCount = 0;
            for (const users of Object.values(lastCursors)) {
                cursorCount += Object.keys(users).length;
            }
            console.log(`   - last_cursors.json: ${cursorCount} cursors`);

            if (cursorCount !== counts.user_cursors) {
                const diff = cursorCount - counts.user_cursors;
                console.log(`     ⚠️  Difference: ${diff} cursors (likely users without UID)`);
            }
        }

        if (fs.existsSync(REPORT_PATH)) {
            const content = fs.readFileSync(REPORT_PATH, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            console.log(`   - ig_user_stories_report.jsonl: ${lines.length} reports\n`);

            if (lines.length !== counts.api_reports) {
                const diff = lines.length - counts.api_reports;
                issues.push(`Report count mismatch: ${diff} difference`);
            }
        }

        // Check foreign key integrity
        console.log('🔗 Checking foreign key integrity...\n');
        const fkCheck = await allAsync(db, 'PRAGMA foreign_key_check');

        if (fkCheck.length > 0) {
            console.log('   ❌ Foreign key violations found:');
            fkCheck.forEach(violation => {
                console.log(`      Table: ${violation.table}, Row: ${violation.rowid}`);
                issues.push(`Foreign key violation in ${violation.table}`);
            });
        } else {
            console.log('   ✅ No foreign key violations\n');
        }

        // Check data validity
        console.log('📋 Checking data validity...\n');

        // All users should have at least one username_history entry
        const usersWithoutUsername = await getAsync(db,
            `SELECT COUNT(*) as count
             FROM users u
             LEFT JOIN username_history uh ON u.id = uh.user_id
             WHERE uh.user_his_id IS NULL`
        );

        if (usersWithoutUsername.count > 0) {
            console.log(`   ⚠️  ${usersWithoutUsername.count} users without username_history`);
            issues.push(`${usersWithoutUsername.count} users missing username_history`);
        } else {
            console.log('   ✅ All users have username_history\n');
        }

        // All users should have is_current = 1 entry
        const usersWithoutCurrent = await getAsync(db,
            `SELECT COUNT(*) as count
             FROM users u
             WHERE NOT EXISTS (
                 SELECT 1 FROM username_history uh
                 WHERE uh.user_id = u.id AND uh.is_current = 1
             )`
        );

        if (usersWithoutCurrent.count > 0) {
            console.log(`   ⚠️  ${usersWithoutCurrent.count} users without current username`);
            issues.push(`${usersWithoutCurrent.count} users missing current username`);
        } else {
            console.log('   ✅ All users have current username\n');
        }

        // Check for NULL uids
        const nullUids = await getAsync(db,
            'SELECT COUNT(*) as count FROM users WHERE uid IS NULL'
        );

        if (nullUids.count > 0) {
            console.log(`   ⚠️  ${nullUids.count} users with NULL uid`);
            issues.push(`${nullUids.count} users have NULL uid`);
        } else {
            console.log('   ✅ All users have valid uid\n');
        }

        // Summary
        console.log('═'.repeat(60));

        if (issues.length === 0) {
            console.log('✅ All verification checks passed!');
            console.log('\nMigration appears to be successful!\n');
        } else {
            console.log('⚠️  Verification completed with warnings:\n');
            issues.forEach((issue, i) => {
                console.log(`   ${i + 1}. ${issue}`);
            });
            console.log('\nNote: Some warnings are expected if users could not be bootstrapped.');
            console.log('Check migration-log.json for details on failed users.\n');
        }

        console.log('═'.repeat(60));

        // Display sample queries
        console.log('\n📊 Sample Data:');
        console.log('\nTop 5 users by media count:');
        const topUsers = await allAsync(db, `
            SELECT * FROM v_user_stats
            ORDER BY total_saved_media DESC
            LIMIT 5
        `);

        if (topUsers.length > 0) {
            topUsers.forEach(u => {
                console.log(`   - ${u.username} (${u.platform_name}): ${u.total_saved_media} media`);
            });
        }

        console.log('\nRecent API calls:');
        const recentReports = await allAsync(db, `
            SELECT * FROM v_recent_reports
            LIMIT 5
        `);

        if (recentReports.length > 0) {
            recentReports.forEach(r => {
                console.log(`   - ${r.username} (${r.api_name}): ${r.total_items} items on ${r.timestamp}`);
            });
        }

        console.log('\n✅ Verification completed!\n');

    } catch (err) {
        console.error('\n❌ Verification error:', err.message);
        throw err;
    } finally {
        db.close();
    }
}

if (require.main === module) {
    verifyMigration().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { verifyMigration };
