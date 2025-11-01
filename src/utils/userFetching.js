/**
 * User Fetching Utilities
 * Smart auto-fetch UID from API if not in database
 * Implements caching strategy for user data
 */

const { getDatabase } = require('../../database/db-v2');
const {
    detectPlatform,
    extractUsernameFromUrl,
    fetchPlatformId,
    autoFetchPlatformId
} = require('./platformIdUtils');

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
        return `https://www.instagram.com/${username}/`;
    } else {
        throw new Error(`Unknown platform: ${platform}`);
    }
}

/**
 * Get or fetch user with UID from database or API
 * This is the main function that implements smart caching:
 * 1. Check database first (fast path)
 * 2. If not found or no UID, fetch from API (slow path, one-time cost)
 * 3. Save to database for future use
 *
 * @param {string} urlOrUsername - Profile URL or username
 * @param {string|null} platform - 'facebook', 'instagram', or null (auto-detect)
 * @param {string} clientId - WebSocket client ID for API calls
 * @returns {Promise<{id: number, uid: string, username: string, platform_name: string, profile_url: string}|null>}
 */
async function getOrFetchUser(urlOrUsername, platform = null, clientId = null) {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        let url, username;

        // Determine if input is URL or username
        if (urlOrUsername.startsWith('http://') || urlOrUsername.startsWith('https://')) {
            url = urlOrUsername;
            username = extractUsernameFromUrl(url);

            // Auto-detect platform if not provided
            if (!platform) {
                platform = detectPlatform(url);
            }
        } else {
            username = urlOrUsername;

            // Must have platform if providing username
            if (!platform) {
                throw new Error('Platform must be specified when providing username instead of URL');
            }

            url = buildProfileUrl(username, platform);
        }

        if (!username) {
            console.warn(`⚠️ Could not extract username from: ${urlOrUsername}`);
            return null;
        }

        if (!platform) {
            console.warn(`⚠️ Could not detect platform from: ${urlOrUsername}`);
            return null;
        }

        // Step 1: Check database by username first
        let user = await db.getUserByUsername(username);

        // Step 2: If user exists and has UID, return immediately (fast path)
        if (user && user.uid) {
            console.log(`✅ Found user in database: ${username} → ${user.uid} (${platform})`);
            return user;
        }

        // Step 3: User not found or missing UID - fetch from API (slow path)
        console.log(`🔄 Fetching UID for user: ${username} (${platform})`);

        if (!clientId) {
            console.warn(`⚠️ No client ID provided for API call, using default`);
        }

        const userInfo = await fetchPlatformId(platform, url, clientId);

        if (!userInfo || !userInfo.uid) {
            console.warn(`⚠️ Could not fetch UID for ${username} from ${platform} API`);

            // Still create user record without UID if they don't exist
            if (!user) {
                user = await db.getOrCreateUser({
                    platform,
                    uid: null,
                    username: username,
                    profile_url: url
                });
                console.log(`⚠️ Created user record without UID: ${username}`);
            }

            return user;
        }

        // Step 4: Save or update user in database
        if (user && !user.uid) {
            // User exists but missing UID - update it
            console.log(`🔄 Updating UID for existing user: ${username} → ${userInfo.uid}`);
            const platformId = platform === 'facebook' ? 1 : 2;
            await db.db.run(
                'UPDATE users SET uid = ? WHERE id = ?',
                [userInfo.uid, user.id]
            );

            // Update username if API returned a different one
            if (userInfo.username && userInfo.username !== username) {
                await db.updateUsername(user.id, userInfo.username, url);
                console.log(`🔄 Updated username: ${username} → ${userInfo.username}`);
            }

            // Fetch updated user
            user = await db.getUserByUid(platform, userInfo.uid);
        } else {
            // Create new user with UID
            user = await db.getOrCreateUser({
                platform,
                uid: userInfo.uid,
                username: userInfo.username || username,
                profile_url: url
            });
            console.log(`✅ New user saved: ${userInfo.username || username} → ${userInfo.uid} (${platform})`);
        }

        return user;

    } catch (err) {
        console.error(`❌ Error in getOrFetchUser for ${urlOrUsername}:`, err.message);
        throw err;
    } finally {
        // Only close if we opened the connection
        if (!dbWasConnected && db.db) {
            db.close();
        }
    }
}

/**
 * Bulk fetch users from URLs
 * Processes multiple URLs in parallel
 *
 * @param {string[]} urls - Array of profile URLs
 * @param {string} clientId - WebSocket client ID for API calls
 * @param {number} concurrency - Max concurrent API calls (default: 3)
 * @returns {Promise<Array<{url: string, user: object|null, error: string|null}>>}
 */
async function bulkFetchUsers(urls, clientId, concurrency = 3) {
    const results = [];
    const queue = [...urls];
    const inProgress = new Set();

    return new Promise((resolve) => {
        const processNext = async () => {
            if (queue.length === 0 && inProgress.size === 0) {
                resolve(results);
                return;
            }

            while (queue.length > 0 && inProgress.size < concurrency) {
                const url = queue.shift();
                const promise = (async () => {
                    try {
                        const user = await getOrFetchUser(url, null, clientId);
                        results.push({ url, user, error: null });
                    } catch (err) {
                        console.error(`Error fetching user for ${url}:`, err.message);
                        results.push({ url, user: null, error: err.message });
                    } finally {
                        inProgress.delete(promise);
                        processNext();
                    }
                })();

                inProgress.add(promise);
            }
        };

        processNext();
    });
}

/**
 * Check if user exists in database with UID
 * @param {string} username - Username to check
 * @returns {Promise<boolean>}
 */
async function userHasUid(username) {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        const user = await db.getUserByUsername(username);
        return user && user.uid ? true : false;

    } finally {
        if (!dbWasConnected && db.db) {
            db.close();
        }
    }
}

/**
 * Get user by UID (skip username lookup)
 * Faster when you already have the UID
 *
 * @param {string} platform - 'facebook' or 'instagram'
 * @param {string} uid - Facebook UID or Instagram UUID
 * @returns {Promise<object|null>}
 */
async function getUserByUid(platform, uid) {
    const db = getDatabase();
    let dbWasConnected = db.db !== null;

    try {
        if (!dbWasConnected) {
            await db.connect();
        }

        return await db.getUserByUid(platform, uid);

    } finally {
        if (!dbWasConnected && db.db) {
            db.close();
        }
    }
}

module.exports = {
    buildProfileUrl,
    getOrFetchUser,
    bulkFetchUsers,
    userHasUid,
    getUserByUid
};
