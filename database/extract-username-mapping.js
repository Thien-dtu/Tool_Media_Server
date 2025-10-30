/**
 * Extract Username Mapping from JSON/JSONL Files
 * Creates a mapping of username → { platform, url }
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(__dirname, 'username-mapping.json');

const SAVED_IMAGES_PATH = path.join(DATA_DIR, 'saved_images.json');
const LAST_CURSORS_PATH = path.join(DATA_DIR, 'last_cursors.json');
const REPORT_PATH = path.join(DATA_DIR, 'ig_user_stories_report.jsonl');

/**
 * Detect platform from API name
 */
function detectPlatformFromApi(apiName) {
    if (apiName.includes('_fb_')) return 'facebook';
    if (apiName.includes('_ig_')) return 'instagram';
    return null;
}

/**
 * Detect platform from URL
 */
function detectPlatformFromUrl(url) {
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    return null;
}

/**
 * Build profile URL from username and platform
 */
function buildProfileUrl(username, platform) {
    if (platform === 'facebook') {
        return `https://www.facebook.com/${username}`;
    } else if (platform === 'instagram') {
        return `https://www.instagram.com/${username}`;
    }
    return null;
}

async function extractUsernameMapping() {
    console.log('🔍 Extracting username mappings from data files\n');

    const mapping = {};
    const stats = {
        fromReports: 0,
        fromCursors: 0,
        fromSavedImages: 0,
        total: 0
    };

    // Priority 1: From reports (most reliable - has actual URLs)
    if (fs.existsSync(REPORT_PATH)) {
        console.log('📊 Reading ig_user_stories_report.jsonl...');
        const content = fs.readFileSync(REPORT_PATH, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
            try {
                const { apiName, report } = JSON.parse(line);
                const platform = detectPlatformFromApi(apiName);

                for (const r of report) {
                    if (r.username && r.url) {
                        const detectedPlatform = detectPlatformFromUrl(r.url) || platform;
                        mapping[r.username] = {
                            platform: detectedPlatform,
                            url: r.url
                        };
                        stats.fromReports++;
                    }
                }
            } catch (err) {
                // Skip invalid lines
            }
        }
        console.log(`   ✅ Found ${stats.fromReports} users\n`);
    }

    // Priority 2: From cursors (API name indicates platform)
    if (fs.existsSync(LAST_CURSORS_PATH)) {
        console.log('📊 Reading last_cursors.json...');
        const data = JSON.parse(fs.readFileSync(LAST_CURSORS_PATH, 'utf8'));

        for (const [apiName, users] of Object.entries(data)) {
            const platform = detectPlatformFromApi(apiName);
            if (!platform) continue;

            for (const username of Object.keys(users)) {
                if (!mapping[username]) {
                    mapping[username] = {
                        platform: platform,
                        url: buildProfileUrl(username, platform)
                    };
                    stats.fromCursors++;
                }
            }
        }
        console.log(`   ✅ Found ${stats.fromCursors} new users\n`);
    }

    // Priority 3: From saved_images (no platform info - skip if not found above)
    if (fs.existsSync(SAVED_IMAGES_PATH)) {
        console.log('📊 Reading saved_images.json...');
        const data = JSON.parse(fs.readFileSync(SAVED_IMAGES_PATH, 'utf8'));

        for (const item of data) {
            if (item.username && !mapping[item.username]) {
                // Can't determine platform - log warning
                stats.fromSavedImages++;
            }
        }

        if (stats.fromSavedImages > 0) {
            console.log(`   ⚠️  ${stats.fromSavedImages} users in saved_images.json have no platform info (will be skipped)\n`);
        } else {
            console.log(`   ✅ All users have platform info\n`);
        }
    }

    stats.total = Object.keys(mapping).length;

    // Save mapping
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapping, null, 2), 'utf8');

    // Display summary
    console.log('📋 Summary:');
    console.log(`   From reports: ${stats.fromReports}`);
    console.log(`   From cursors: ${stats.fromCursors}`);
    console.log(`   Total unique users: ${stats.total}`);
    console.log(`\n✅ Saved to: ${OUTPUT_PATH}\n`);

    // Platform breakdown
    const platformBreakdown = {};
    for (const { platform } of Object.values(mapping)) {
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
    }

    console.log('📊 Platform breakdown:');
    for (const [platform, count] of Object.entries(platformBreakdown)) {
        console.log(`   ${platform}: ${count}`);
    }
    console.log();

    return { mapping, stats };
}

// Run if executed directly
if (require.main === module) {
    extractUsernameMapping().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { extractUsernameMapping };
