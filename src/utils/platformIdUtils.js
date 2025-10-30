/**
 * Platform ID Utilities
 * Fetch Facebook UID and Instagram UUID from API endpoints
 */

const axios = require('axios');
const { retryWithBackoff, shouldRetryNetworkError } = require('./retryUtils');

// Default client ID (can be overridden)
const DEFAULT_CLIENT_ID = process.env.CLIENT_ID || 'client_default';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Detect platform from URL
 * @param {string} url - Profile URL
 * @returns {string|null} - 'facebook', 'instagram', or null
 */
function detectPlatform(url) {
    if (!url) return null;
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    return null;
}

/**
 * Detect platform from API name
 * @param {string} apiName - API endpoint name
 * @returns {string|null} - 'facebook', 'instagram', or null
 */
function detectPlatformFromApiName(apiName) {
    if (!apiName) return null;
    if (apiName.startsWith('get_list_fb_') || apiName.startsWith('get_fb_')) return 'facebook';
    if (apiName.startsWith('get_list_ig_') || apiName.startsWith('get_ig_')) return 'instagram';
    return null;
}

/**
 * Extract username from URL
 * @param {string} url - Profile URL
 * @returns {string|null} - Username or null
 */
function extractUsernameFromUrl(url) {
    if (!url) return null;

    try {
        const urlObj = new URL(url);

        // Facebook patterns
        if (urlObj.hostname.includes('facebook.com')) {
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                // Handle profile.php?id=xxx
                if (pathParts[0] === 'profile.php' && urlObj.searchParams.has('id')) {
                    return urlObj.searchParams.get('id');
                }
                // Skip photo.php, story.php, etc.
                if (!['photo.php', 'story.php', 'watch'].includes(pathParts[0])) {
                    return pathParts[0];
                }
            }
        }

        // Instagram patterns
        if (urlObj.hostname.includes('instagram.com')) {
            let path = urlObj.pathname.split('/').filter(Boolean)[0];
            if (path && path.endsWith('/')) path = path.slice(0, -1);
            if (path && !['p', 'reel', 'stories', 'tv'].includes(path)) {
                return path;
            }
        }
    } catch (err) {
        console.error('Error parsing URL:', err.message);
    }

    return null;
}

/**
 * Fetch Facebook UID from API
 * @param {string} url - Facebook profile URL
 * @param {string} clientId - WebSocket client ID
 * @returns {Promise<{uid: string, name: string, avatar: string}|null>}
 */
async function fetchFacebookUid(url, clientId = DEFAULT_CLIENT_ID) {
    try {
        const response = await retryWithBackoff(
            () => axios.post(`${API_BASE_URL}/call`, {
                id: clientId,
                apiname: 'get_fb_entity_info',
                apiparams: { url, raw: '' }
            }, { timeout: 30000 }),
            { maxRetries: 3, shouldRetry: shouldRetryNetworkError }
        );

        const data = response.data;

        // Check if it's a successful response with result
        if (data.result && data.result.uid) {
            return {
                uid: data.result.uid,
                name: data.result.name,
                avatar: data.result.avatar || data.result.avatarBig
            };
        }

        console.warn(`No UID found in response for ${url}`);
        return null;
    } catch (err) {
        console.error(`Error fetching Facebook UID for ${url}:`, err.message);
        return null;
    }
}

/**
 * Fetch Instagram UUID from API
 * @param {string} url - Instagram profile URL
 * @param {string} clientId - WebSocket client ID
 * @returns {Promise<{uid: string, name: string, avatar: string, username: string}|null>}
 */
async function fetchInstagramUuid(url, clientId = DEFAULT_CLIENT_ID) {
    try {
        const response = await retryWithBackoff(
            () => axios.post(`${API_BASE_URL}/call`, {
                id: clientId,
                apiname: 'get_ig_user_info',
                apiparams: { url, raw: false }
            }, { timeout: 30000 }),
            { maxRetries: 3, shouldRetry: shouldRetryNetworkError }
        );

        const data = response.data;

        // Check if it's a successful response with result
        if (data.result && data.result.uid) {
            return {
                uid: data.result.uid,
                name: data.result.name,
                avatar: data.result.avatar || data.result.avatarBig,
                username: data.result.username
            };
        }

        console.warn(`No UUID found in response for ${url}`);
        return null;
    } catch (err) {
        console.error(`Error fetching Instagram UUID for ${url}:`, err.message);
        return null;
    }
}

/**
 * Fetch platform ID (UID or UUID) based on platform
 * @param {string} platform - 'facebook' or 'instagram'
 * @param {string} url - Profile URL
 * @param {string} clientId - WebSocket client ID
 * @returns {Promise<{uid: string, name: string, avatar: string, username?: string}|null>}
 */
async function fetchPlatformId(platform, url, clientId = DEFAULT_CLIENT_ID) {
    if (platform === 'facebook') {
        return await fetchFacebookUid(url, clientId);
    } else if (platform === 'instagram') {
        return await fetchInstagramUuid(url, clientId);
    } else {
        console.error(`Unknown platform: ${platform}`);
        return null;
    }
}

/**
 * Auto-detect platform and fetch ID
 * @param {string} url - Profile URL
 * @param {string} clientId - WebSocket client ID
 * @returns {Promise<{platform: string, uid: string, name: string, avatar: string, username?: string}|null>}
 */
async function autoFetchPlatformId(url, clientId = DEFAULT_CLIENT_ID) {
    const platform = detectPlatform(url);
    if (!platform) {
        console.error(`Could not detect platform from URL: ${url}`);
        return null;
    }

    const result = await fetchPlatformId(platform, url, clientId);
    if (result) {
        return { platform, ...result };
    }

    return null;
}

module.exports = {
    detectPlatform,
    detectPlatformFromApiName,
    extractUsernameFromUrl,
    fetchFacebookUid,
    fetchInstagramUuid,
    fetchPlatformId,
    autoFetchPlatformId
};
