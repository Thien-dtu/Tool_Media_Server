/**
 * Create Fresh Database with v2 Schema
 * Creates a new database with uid/uuid-based user system
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'social_media.db');
const SCHEMA_PATH = path.join(__dirname, 'schema-v2.sql');

async function createDatabase() {
    console.log('🚀 Creating fresh database with v2 schema\n');

    // Check if database exists
    if (fs.existsSync(DB_PATH)) {
        const backup = `${DB_PATH}.backup.${Date.now()}`;
        console.log(`⚠️  Database exists, backing up to: ${backup}`);
        fs.renameSync(DB_PATH, backup);
    }

    // Create database
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error creating database:', err.message);
            process.exit(1);
        }
    });

    // Read schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

    // Execute schema using db.exec() to handle entire file at once
    return new Promise((resolve, reject) => {
        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Error executing schema:', err.message);
                reject(err);
                return;
            }

            // Count tables and views
            db.all("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view', 'index') ORDER BY type, name", (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const tables = rows.filter(r => r.type === 'table');
                const views = rows.filter(r => r.type === 'view');
                const indexes = rows.filter(r => r.type === 'index');

                console.log('✅ Database created successfully!\n');
                console.log(`📊 Tables created: ${tables.length}`);
                tables.forEach(t => console.log(`   - ${t.name}`));

                console.log(`\n📊 Views created: ${views.length}`);
                views.forEach(v => console.log(`   - ${v.name}`));

                console.log(`\n📊 Indexes created: ${indexes.length}`);

                console.log(`\n📁 Database location: ${DB_PATH}\n`);

                db.close();
                resolve();
            });
        });
    });
}

// Run if executed directly
if (require.main === module) {
    createDatabase().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { createDatabase };
