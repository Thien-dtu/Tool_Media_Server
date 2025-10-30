/**
 * Migrate ig_user_stories_report.jsonl to api_reports and report_details tables
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'social_media.db');
const REPORT_PATH = path.join(__dirname, '..', 'data', 'ig_user_stories_report.jsonl');

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

function parseDuration(durationStr) {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

async function migrateReports() {
    console.log('🚀 Migrating ig_user_stories_report.jsonl → api_reports + report_details\n');

    if (!fs.existsSync(REPORT_PATH)) {
        console.log('⚠️  ig_user_stories_report.jsonl not found, skipping\n');
        return;
    }

    const content = fs.readFileSync(REPORT_PATH, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    console.log(`📊 Found ${lines.length} report entries\n`);

    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
    });

    await runAsync(db, 'PRAGMA foreign_keys = ON');

    const stats = {
        total: lines.length,
        reportsInserted: 0,
        detailsInserted: 0,
        detailsSkipped: 0
    };

    try {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Progress
            if ((i + 1) % 100 === 0) {
                process.stdout.write(`\r🔄 Processing: ${i + 1}/${lines.length}`);
            }

            try {
                const reportData = JSON.parse(line);
                const { apiName, report, timestamp } = reportData;

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

                // Insert api_report
                const reportResult = await runAsync(db,
                    'INSERT INTO api_reports (api_type_id, timestamp) VALUES (?, ?)',
                    [apiType.id, timestamp]
                );

                const reportId = reportResult.lastID;
                stats.reportsInserted++;

                // Insert report_details
                for (const detail of report) {
                    // Find user
                    const user = await getAsync(db,
                        `SELECT u.id
                         FROM users u
                         JOIN username_history uh ON u.id = uh.user_id
                         WHERE uh.username = ? AND uh.is_current = 1`,
                        [detail.username]
                    );

                    if (!user) {
                        stats.detailsSkipped++;
                        continue;
                    }

                    // Insert detail
                    await runAsync(db,
                        `INSERT INTO report_details
                         (report_id, user_id, url, total_items, items_saved,
                          items_not_saved, duration, pages_fetched, media_ids)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            reportId,
                            user.id,
                            detail.url,
                            detail.total,
                            detail.have,
                            detail.nohave,
                            parseDuration(detail.time),
                            detail.pages,
                            JSON.stringify(detail.ids || [])
                        ]
                    );

                    stats.detailsInserted++;
                }
            } catch (err) {
                console.error(`\n   ⚠️  Error processing line ${i + 1}:`, err.message);
            }
        }

        console.log('\n'); // New line after progress

        console.log('═'.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   Total report lines: ${stats.total}`);
        console.log(`   Reports inserted: ${stats.reportsInserted}`);
        console.log(`   Report details inserted: ${stats.detailsInserted}`);
        console.log(`   Report details skipped (user not found): ${stats.detailsSkipped}`);
        console.log('═'.repeat(60));
        console.log('\n✅ Reports migration completed!\n');

    } catch (err) {
        console.error('\n❌ Migration error:', err.message);
        throw err;
    } finally {
        db.close();
    }
}

if (require.main === module) {
    migrateReports().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { migrateReports };
