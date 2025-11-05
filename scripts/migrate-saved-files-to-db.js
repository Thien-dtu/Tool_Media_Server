/**
 * Migrate saved_images.json data to database
 * This is a one-time migration script
 */

const { readSavedList } = require('../src/utils/fileUtils');
const { getDatabase } = require('../database/db-v3');

async function migrate() {
    console.log('🔄 Starting migration from saved_images.json to database...\n');

    const db = getDatabase();

    // ⭐️ KHAI BÁO MẢNG MỚI ĐỂ LƯU CÁC USERNAME KHÔNG TÌM THẤY
    const usersNotFound = [];

    try {
        await db.connect();
        console.log('✅ Database connected\n');

        // Read file-based saved list
        const savedList = await readSavedList();
        console.log(`📄 Found ${savedList.length} items in saved_images.json\n`);

        if (savedList.length === 0) {
            console.log('⚠️  No items to migrate');
            return;
        }

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const item of savedList) {
            const { username, id: mediaId } = item;

            if (!username || !mediaId) {
                console.warn(`⚠️  Skipping invalid item:`, item);
                skipped++;
                continue;
            }

            try {
                // Check if user exists
                const user = await db.getUserByUsername(username);

                if (!user) {
                    console.warn(`⚠️  User not found in database: ${username} - skipping ${mediaId}`);
                    // ⭐️ LƯU USERNAME VÀO MẢNG NẾU KHÔNG TÌM THẤY
                    usersNotFound.push(username);
                    skipped++;
                    continue;
                }

                // Check if already saved
                const alreadySaved = await db.isMediaSaved(username, mediaId);

                if (alreadySaved) {
                    skipped++;
                    if (skipped % 100 === 0) {
                        console.log(`⏭️  Skipped ${skipped} already-saved items...`);
                    }
                    continue;
                }

                // Save to database
                await db.saveMedia(username, mediaId);
                migrated++;

                if (migrated % 100 === 0) {
                    console.log(`💾 Migrated ${migrated} items so far...`);
                }

            } catch (err) {
                console.error(`❌ Error migrating ${mediaId} for ${username}:`, err.message);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration complete!');
        console.log('='.repeat(60));
        console.log(`📊 Summary:`);
        console.log(`   Total items in file: ${savedList.length}`);
        console.log(`   Migrated to database: ${migrated}`);
        console.log(`   Already in database (skipped): ${skipped}`);
        console.log(`   Errors: ${errors}`);
        console.log('='.repeat(60) + '\n');


        // ⭐️ PHẦN BÁO CÁO MỚI CHO CÁC USERNAME KHÔNG TÌM THẤY
        const uniqueUsersNotFound = [...new Set(usersNotFound)]; // Loại bỏ các tên trùng lặp
        console.log(`⚠️  Users not found in database (${uniqueUsersNotFound.length} unique users):`);
        if (uniqueUsersNotFound.length > 0) {
            console.log(uniqueUsersNotFound.join(', '));
        } else {
            console.log('   None.');
        }
        console.log('='.repeat(60) + '\n');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        db.close();
        console.log('✅ Database connection closed');
    }
}

// Run migration
migrate()
    .then(() => {
        console.log('\n✨ All done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Migration failed:', err);
        process.exit(1);
    });
